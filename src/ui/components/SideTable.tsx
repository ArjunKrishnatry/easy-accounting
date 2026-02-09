import { useState } from 'react';
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

interface SideTableProps {
    uploadedFiles: FileOrFolder[];
    onFileSelect: (fileId: string) => void;
    selectedFileId: string | null;
    onRefresh: () => void;
    onDelete?: (id: string, type: 'file' | 'folder') => void;
}

export default function SideTable({ uploadedFiles, onFileSelect, selectedFileId, onRefresh, onDelete }: SideTableProps) {
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingFile, setRenamingFile] = useState<string | null>(null);
    const [newFileName, setNewFileName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [showFolderDropdown, setShowFolderDropdown] = useState<string | null>(null);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await api.post('/create-folder', {
                folder_name: newFolderName.trim()
            });
            setNewFolderName('');
            setShowCreateFolder(false);
            onRefresh();
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Failed to create folder');
        }
    };

    const handleRenameFile = async (fileId: string) => {
        if (!newFileName.trim()) return;

        try {
            await api.post('/rename-file', {
                file_id: fileId,
                new_name: newFileName.trim()
            });
            setNewFileName('');
            setRenamingFile(null);
            onRefresh();
        } catch (error) {
            console.error('Error renaming file:', error);
            alert('Failed to rename file');
        }
    };

    const handleMoveToFolder = async (fileId: string, folderId: string) => {
        try {
            await api.post('/move-file', {
                file_id: fileId,
                folder_id: folderId
            });
            setShowFolderDropdown(null);
            onRefresh();
        } catch (error) {
            console.error('Error moving file:', error);
            alert('Failed to move file to folder');
        }
    };

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const getAvailableFolders = () => {
        return uploadedFiles.filter((item) => 'type' in item && item.type === 'folder') as FolderRecord[];
    };

    const renderFile = (file: FileRecord, isInFolder = false) => {
        const availableFolders = getAvailableFolders();
        const isInAnyFolder = uploadedFiles
            .filter(folderItem => 'type' in folderItem && folderItem.type === 'folder')
            .some(folder => (folder as FolderRecord).files.some(f => f.id === file.id));

        return (
            <div
                key={file.id}
                className={`
                    rounded-lg p-4 cursor-pointer transition-all duration-200 border-2
                    ${selectedFileId === file.id
                        ? 'bg-primary-50 border-primary-500 shadow-md'
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 hover:shadow-sm'
                    }
                    ${isInFolder ? 'ml-4 border-l-4 border-l-primary-400' : ''}
                `}
                onClick={() => onFileSelect(file.id)}
            >
                {/* File Name & Date (stacked) - Then Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        {/* Name on top */}
                        <h3 className="text-sm font-semibold text-white truncate leading-tight">
                            {file.filename}
                        </h3>
                        {/* Date below */}
                        <p className="text-xs text-zinc-400 mt-1">
                            {new Date(file.uploadDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setRenamingFile(file.id);
                                setNewFileName(file.filename);
                            }}
                            title="Rename"
                        >
                            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        {!isInAnyFolder && availableFolders.length > 0 && (
                            <button
                                className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFolderDropdown(showFolderDropdown === file.id ? null : file.id);
                                }}
                                title="Move to folder"
                            >
                                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(file.id, 'file');
                                }}
                                title="Delete"
                            >
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* File Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                        <span className="text-zinc-400 block">Records</span>
                        <p className="font-semibold text-white">{file.totalRecords}</p>
                    </div>
                    <div>
                        <span className="text-zinc-400 block">Expense</span>
                        <p className="font-semibold text-red-600">${file.totalExpense.toFixed(2)}</p>
                    </div>
                    <div>
                        <span className="text-zinc-400 block">Income</span>
                        <p className="font-semibold text-green-600">${file.totalIncome.toFixed(2)}</p>
                    </div>
                </div>

                {/* Rename Form */}
                {renamingFile === file.id && (
                    <div className="mt-3 pt-3 border-t border-zinc-700" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRenameFile(file.id)}
                            className="w-full px-3 py-2 text-sm border border-zinc-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
                            placeholder="New filename"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleRenameFile(file.id)}
                                className="flex-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setRenamingFile(null)}
                                className="px-3 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Folder Dropdown */}
                {showFolderDropdown === file.id && (
                    <div className="mt-3 pt-3 border-t border-zinc-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-zinc-300">Move to folder:</span>
                            <button
                                onClick={() => setShowFolderDropdown(null)}
                                className="text-zinc-400 hover:text-zinc-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {availableFolders.length === 0 ? (
                            <p className="text-sm text-zinc-400 text-center py-2">No folders available</p>
                        ) : (
                            <div className="space-y-1">
                                {availableFolders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => handleMoveToFolder(file.id, folder.id)}
                                        className="w-full text-left px-3 py-2 text-sm bg-zinc-900 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <span className="font-medium text-zinc-300">{folder.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderFolder = (folder: FolderRecord) => (
        <div key={folder.id} className="bg-zinc-800 border-2 border-zinc-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    expandedFolders.has(folder.id) ? 'bg-primary-50 border-b-2 border-primary-200' : 'hover:bg-zinc-900'
                }`}
                onClick={() => toggleFolder(folder.id)}
            >
                <div className="flex items-center gap-3 flex-1">
                    <svg className={`w-5 h-5 text-zinc-500 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <h3 className="font-semibold text-white text-sm">{folder.name}</h3>
                    <span className="text-xs text-zinc-400 bg-zinc-700 px-2 py-0.5 rounded-full">
                        {folder.files.length}
                    </span>
                </div>
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(folder.id, 'folder');
                        }}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors ml-2"
                        title="Delete folder"
                    >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
            {expandedFolders.has(folder.id) && (
                <div className="p-4 space-y-3 bg-zinc-900">
                    {folder.files.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-4">No files in this folder</p>
                    ) : (
                        folder.files.map(file => renderFile(file, true))
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Create Folder Button */}
            <button
                onClick={() => setShowCreateFolder(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
            </button>

            {/* Create Folder Form */}
            {showCreateFolder && (
                <div className="bg-zinc-800 border-2 border-primary-300 rounded-lg p-4 shadow-sm">
                    <input
                        type="text"
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                        className="w-full px-3 py-2 text-sm border border-zinc-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-3"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateFolder}
                            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setShowCreateFolder(false)}
                            className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Files List */}
            <div className="space-y-3">
                {uploadedFiles.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-zinc-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-zinc-400">No files uploaded yet</p>
                    </div>
                ) : (
                    <>
                        {/* Render folders */}
                        {uploadedFiles
                            .filter((item) => 'type' in item && item.type === 'folder')
                            .map((item) => renderFolder(item as FolderRecord))
                        }

                        {/* Render unassigned files */}
                        {uploadedFiles
                            .filter((item) => {
                                if ('type' in item && item.type === 'folder') return false;
                                const fileId = (item as FileRecord).id;
                                const isInAnyFolder = uploadedFiles
                                    .filter(folderItem => 'type' in folderItem && folderItem.type === 'folder')
                                    .some(folder => (folder as FolderRecord).files.some(file => file.id === fileId));
                                return !isInAnyFolder;
                            })
                            .map((item) => renderFile(item as FileRecord))
                        }
                    </>
                )}
            </div>
        </div>
    );
}
