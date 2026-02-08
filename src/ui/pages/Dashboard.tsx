import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TableView from '../components/TableView';
import DataView from '../components/DataView';
import ClassificationSelector from '../components/ClassificationSelector';
import SideTable from '../components/SideTable';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import api from '../api';

interface FileRecord {
  id: string;
  filename: string;
  uploadDate: string;
  totalRecords: number;
  totalExpense: number;
  totalIncome: number;
}

interface FolderRecord {
  id: string;
  type: 'folder';
  name: string;
  createdDate: string;
  files: FileRecord[];
}

type FileOrFolder = FileRecord | FolderRecord;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [showTableView, setShowTableView] = useState(true);
  const [showClassifier, setShowClassifier] = useState(false);
  const [remaningclassifications, setRemaningClassifications] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileOrFolder[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    itemType: 'file' | 'folder';
    folderFileCount?: number;
  }>({
    isOpen: false,
    itemId: '',
    itemName: '',
    itemType: 'file'
  });

  // Load stored files on component mount
  useEffect(() => {
    loadStoredFiles();
  }, []);

  const loadStoredFiles = async () => {
    try {
      const response = await api.get('/stored-files');
      setUploadedFiles(response.data);
    } catch (error) {
      console.error('Error loading stored files:', error);
    }
  };

  const handleFileSelect = async (fileId: string) => {
    try {
      const response = await api.get(`/file-data/${fileId}`);
      if (response.data.data) {
        setParsedData(response.data.data);
        setSelectedFileId(fileId);
        setShowClassifier(false);
      }
    } catch (error) {
      console.error('Error loading file data:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post("/uploadcsv", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.parsed) {
        setParsedData(response.data.parsed);
        if (response.data.fileId) {
          setSelectedFileId(response.data.fileId);
        }

        if (Array.isArray(response.data.rem_class) && response.data.rem_class.length > 0) {
          setRemaningClassifications(response.data.rem_class);
          setShowClassifier(true);
        } else {
          setRemaningClassifications([]);
          setShowClassifier(false);
        }

        await loadStoredFiles();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset input so same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteClick = (id: string, type: 'file' | 'folder') => {
    // Find the item to get its name - search root level and inside folders
    let item: FileOrFolder | undefined = uploadedFiles.find(f => f.id === id);

    // If not found at root level, search inside folders
    if (!item) {
      for (const folderItem of uploadedFiles) {
        if ('type' in folderItem && folderItem.type === 'folder') {
          const fileInFolder = folderItem.files.find(f => f.id === id);
          if (fileInFolder) {
            item = fileInFolder;
            break;
          }
        }
      }
    }

    if (!item) return;

    const itemName = 'type' in item && item.type === 'folder' ? item.name : (item as FileRecord).filename;
    const folderFileCount = 'type' in item && item.type === 'folder' ? item.files.length : 0;

    setDeleteModal({
      isOpen: true,
      itemId: id,
      itemName,
      itemType: type,
      folderFileCount
    });
  };

  const handleDeleteSuccess = () => {
    loadStoredFiles();
    // Clear selection if the deleted item was selected
    if (deleteModal.itemId === selectedFileId) {
      setSelectedFileId(null);
      setParsedData([]);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100">
      {/* Top Navigation Bar - Fixed at top */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">EasyAccounting</h1>
                <p className="text-sm text-slate-500">Financial Management</p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">Welcome, {user?.name}!</p>
                <p className="text-xs text-slate-500">Manage your finances</p>
              </div>
              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                title="Upload CSV"
              >
                {isUploading ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
                <span className="font-medium hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload CSV'}</span>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - This is the only scrollable area */}
      <main className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Sidebar - File List */}
            <div className="lg:col-span-1 min-h-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Files</h2>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <SideTable
                    uploadedFiles={uploadedFiles}
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFileId}
                    onRefresh={loadStoredFiles}
                    onDelete={handleDeleteClick}
                  />
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 min-h-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                {/* View Toggle */}
                {!showClassifier && parsedData.length > 0 && (
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {showTableView ? 'Transaction Table' : 'Data Visualization'}
                    </h2>
                    <button
                      onClick={() => setShowTableView(!showTableView)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 font-medium"
                    >
                      {showTableView ? 'Show Charts' : 'Show Table'}
                    </button>
                  </div>
                )}

                {/* Content Display */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {showClassifier ? (
                    <ClassificationSelector
                      setShowClassifier={setShowClassifier}
                      RemainingClassifications={remaningclassifications}
                      setParsedData={setParsedData}
                      parsedData={parsedData}
                      selectedFileId={selectedFileId}
                    />
                  ) : parsedData.length > 0 ? (
                    showTableView ? (
                      <TableView data={parsedData} />
                    ) : (
                      <DataView data={parsedData} />
                    )
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-slate-900">No data selected</h3>
                      <p className="mt-1 text-sm text-slate-500">Upload a file or select one from the sidebar to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onSuccess={handleDeleteSuccess}
        itemType={deleteModal.itemType}
        itemName={deleteModal.itemName}
        itemId={deleteModal.itemId}
        folderFileCount={deleteModal.folderFileCount}
      />
    </div>
  );
}
