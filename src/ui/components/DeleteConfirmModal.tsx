import { useState } from 'react';
import api from '../api';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemType: 'file' | 'folder';
    itemName: string;
    itemId: string;
    folderFileCount?: number;
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onSuccess,
    itemType,
    itemName,
    itemId,
    folderFileCount = 0
}: DeleteConfirmModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [deleteContents, setDeleteContents] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async () => {
        setError(null);

        // Validate inputs
        if (!username.trim()) {
            setError('Please enter your username');
            return;
        }
        if (!password.trim()) {
            setError('Please enter your password');
            return;
        }

        // Check if folder has contents and user hasn't confirmed deletion
        if (itemType === 'folder' && folderFileCount > 0 && !deleteContents) {
            setError('Please confirm deletion of folder contents');
            return;
        }

        setIsDeleting(true);

        try {
            // Re-authenticate
            const authResponse = await api.post('/api/auth/check', {
                entered_name: username.trim(),
                entered_password: password
            });

            if (!authResponse.data.ok) {
                setError('Invalid credentials. Please try again.');
                setIsDeleting(false);
                return;
            }

            // Delete the item
            const endpoint = itemType === 'file' ? `/file/${itemId}` : `/folder/${itemId}`;
            await api.delete(endpoint, {
                data: itemType === 'folder' ? { delete_contents: deleteContents } : undefined
            });

            // Success
            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Delete error:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Invalid credentials');
            } else if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to delete. Please try again.');
            }
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        setUsername('');
        setPassword('');
        setDeleteContents(false);
        setError(null);
        setIsDeleting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-300 bg-opacity-50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 rounded-full p-2">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
                            <p className="text-sm text-slate-600">This action cannot be undone</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={isDeleting}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Warning Message */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800">
                        You are about to delete <strong className="font-semibold">{itemType}</strong>:{' '}
                        <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded">{itemName}</span>
                    </p>
                    {itemType === 'folder' && folderFileCount > 0 && (
                        <p className="text-sm text-red-800 mt-2">
                            This folder contains <strong>{folderFileCount}</strong> file{folderFileCount !== 1 ? 's' : ''}.
                        </p>
                    )}
                </div>

                {/* Folder contents checkbox */}
                {itemType === 'folder' && folderFileCount > 0 && (
                    <label className="flex items-start gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                        <input
                            type="checkbox"
                            checked={deleteContents}
                            onChange={(e) => setDeleteContents(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-red-600 border-amber-300 rounded focus:ring-red-500"
                            disabled={isDeleting}
                        />
                        <span className="text-sm text-amber-900">
                            I understand this will permanently delete the folder and all {folderFileCount} file{folderFileCount !== 1 ? 's' : ''} inside it
                        </span>
                    </label>
                )}

                {/* Re-authentication Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Confirm your username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                            placeholder="Enter your username"
                            disabled={isDeleting}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Confirm your password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleDelete()}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                            placeholder="Enter your password"
                            disabled={isDeleting}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleClose}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete {itemType}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
