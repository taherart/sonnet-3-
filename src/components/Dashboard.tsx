import React, { useState, useEffect } from 'react';
import BookUploader from './BookUploader';
import BooksList from './BooksList';
import { getBooks, scanForNewBooks, testStorageAccess, ensureRequiredBuckets, checkSupabasePermissions } from '../services/bookService';
import { BookWithProgress } from '../types';
import toast from 'react-hot-toast';
import { RefreshCw, Database, AlertTriangle, FolderPlus, Shield } from 'lucide-react';

export default function Dashboard() {
  const [books, setBooks] = useState<BookWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [creatingBuckets, setCreatingBuckets] = useState(false);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [permissionsStatus, setPermissionsStatus] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const booksData = await getBooks();
      setBooks(booksData);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const handleScanForBooks = async () => {
    setScanning(true);
    try {
      const result = await scanForNewBooks();
      if (result) {
        toast.success('Scan completed successfully');
        fetchBooks();
      } else {
        toast.error('Scan failed');
      }
    } catch (error) {
      console.error('Error scanning for books:', error);
      toast.error('Error scanning for books');
    } finally {
      setScanning(false);
    }
  };

  const checkStorageAccess = async () => {
    try {
      const result = await testStorageAccess();
      setStorageStatus(result);
      
      if (result.success) {
        toast.success(`Storage access successful. Found ${result.files?.length || 0} files.`);
      } else {
        toast.error(`Storage access failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing storage access:', error);
      setStorageStatus({
        success: false,
        stage: 'test_function_error',
        error: error.message
      });
      toast.error('Error testing storage access');
    }
  };

  const handleCreateBuckets = async () => {
    setCreatingBuckets(true);
    try {
      const result = await ensureRequiredBuckets();
      if (result) {
        toast.success('Storage buckets created successfully');
        // Re-test storage access to update the status
        await checkStorageAccess();
      } else {
        toast.error('Failed to create storage buckets');
      }
    } catch (error) {
      console.error('Error creating buckets:', error);
      toast.error('Error creating storage buckets');
    } finally {
      setCreatingBuckets(false);
    }
  };

  const handleCheckPermissions = async () => {
    setCheckingPermissions(true);
    try {
      const result = await checkSupabasePermissions();
      setPermissionsStatus(result);
      
      if (result.storage?.success) {
        toast.success('Supabase storage permissions are valid');
      } else {
        toast.error(`Storage permission issue: ${result.storage?.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      toast.error('Error checking Supabase permissions');
    } finally {
      setCheckingPermissions(false);
    }
  };

  useEffect(() => {
    // Check storage access and permissions on component mount
    checkStorageAccess();
    handleCheckPermissions();
    fetchBooks();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">MCQ Generator Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleCheckPermissions}
            disabled={checkingPermissions}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center"
            title="Check Supabase Permissions"
          >
            <Shield className="w-5 h-5 mr-2" />
            {checkingPermissions ? 'Checking...' : 'Check Permissions'}
          </button>
          <button
            onClick={handleCreateBuckets}
            disabled={creatingBuckets}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
            title="Create Storage Buckets"
          >
            <FolderPlus className="w-5 h-5 mr-2" />
            {creatingBuckets ? 'Creating...' : 'Create Buckets'}
          </button>
          <button
            onClick={checkStorageAccess}
            className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-md flex items-center"
            title="Test Storage Access"
          >
            <Database className="w-5 h-5 mr-2" />
            Test Storage
          </button>
          <button
            onClick={handleScanForBooks}
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Scan for Books'}
          </button>
        </div>
      </div>

      {permissionsStatus && (
        <div className={`mb-6 p-4 rounded-lg ${permissionsStatus.storage?.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start">
            {permissionsStatus.storage?.success ? (
              <div className="bg-green-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            ) : (
              <div className="bg-red-100 p-2 rounded-full">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${permissionsStatus.storage?.success ? 'text-green-800' : 'text-red-800'}`}>
                Supabase Permissions {permissionsStatus.storage?.success ? 'Valid' : 'Issue Detected'}
              </h3>
              <div className="mt-2">
                {permissionsStatus.storage?.success ? (
                  <p className="text-sm text-green-700">
                    Your Supabase API key has the necessary permissions to access storage.
                  </p>
                ) : (
                  <div>
                    <p className="text-sm text-red-700">
                      Storage permission issue: {permissionsStatus.storage?.error?.message || 'Unknown error'}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      You may need to check your Supabase API key or enable storage permissions in your Supabase project settings.
                    </p>
                  </div>
                )}
                <button 
                  onClick={() => setShowDebugInfo(!showDebugInfo)} 
                  className="text-sm underline mt-2"
                >
                  {showDebugInfo ? 'Hide' : 'Show'} Debug Info
                </button>
              </div>
              {showDebugInfo && (
                <pre className="mt-3 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(permissionsStatus, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {storageStatus && (
        <div className={`mb-6 p-4 rounded-lg ${storageStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start">
            {storageStatus.success ? (
              <div className="bg-green-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            ) : (
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${storageStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                Storage Access {storageStatus.success ? 'Successful' : 'Failed'}
              </h3>
              <div className="mt-2">
                {storageStatus.success ? (
                  <p className="text-sm text-green-700">
                    Found {storageStatus.buckets?.length || 0} buckets and {storageStatus.files?.length || 0} files in the books bucket.
                  </p>
                ) : (
                  <div>
                    <p className="text-sm text-red-700">
                      Failed at stage: {storageStatus.stage}. Error: {storageStatus.error}
                    </p>
                    {storageStatus.stage === 'find_books_bucket' && (
                      <p className="text-sm text-red-700 mt-1">
                        Click "Create Buckets" to create the required storage buckets.
                      </p>
                    )}
                  </div>
                )}
                <button 
                  onClick={() => setShowDebugInfo(!showDebugInfo)} 
                  className="text-sm underline mt-2"
                >
                  {showDebugInfo ? 'Hide' : 'Show'} Debug Info
                </button>
              </div>
              {showDebugInfo && (
                <pre className="mt-3 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                  {JSON.stringify(storageStatus, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload New Book</h2>
          <BookUploader onUploadSuccess={fetchBooks} />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Books</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">Loading books...</p>
            </div>
          ) : (
            <BooksList books={books} onAction={fetchBooks} />
          )}
        </div>
      </div>
    </div>
  );
}
