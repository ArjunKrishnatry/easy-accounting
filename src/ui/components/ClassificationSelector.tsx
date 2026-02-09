import { useState, useEffect } from 'react';
import api from "../api";
import DropDown from './DropDown';

interface ClassificationSelectorProps {
    setShowClassifier: (show: boolean) => void;
    RemainingClassifications: any[]
    setParsedData: (data: any[]) => void
    parsedData: any[]
    selectedFileId?: string | null
}

export default function ClassificationSelector({ setShowClassifier, RemainingClassifications, setParsedData, parsedData, selectedFileId }: ClassificationSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [remaninglen, setRemaningLen] = useState<number>(RemainingClassifications.length - 1);
    const [loading, setLoading] = useState(true);
    const [transactionType, setTransactionType] = useState<string>("");
    const [amt, setAmt] = useState<any>(null);
    const [activity, setActivity] = useState<string>("");
    const [showNewClassificationForm, setShowNewClassificationForm] = useState(false);
    const [newClassificationName, setNewClassificationName] = useState("");

    useEffect(() => {
        if (remaninglen >= 0 && RemainingClassifications[remaninglen]) {
            const current = RemainingClassifications[remaninglen];
            setActivity(current.activity);
            if (current.expense === 0) {
                setTransactionType("Income");
                setAmt(current.income);
            } else {
                setTransactionType("Expense");
                setAmt(current.expense);
            }
        }
    }, [remaninglen, RemainingClassifications]);

    useEffect(() => {
        async function fetchOptions() {
            setLoading(true);
            try {
                const endpoint = transactionType === "Income" ? "/income-options" : "/expense-options";
                const response = await api.get(endpoint);
                setOptions(response.data.options);
            } catch (error) {
                console.error("Error fetching classification options:", error);
            } finally {
                setLoading(false);
            }
        }
        if (transactionType) fetchOptions();
    }, [transactionType]);

    async function handleSave() {
        if (!selectedOption) return;
        try {
            await api.post("/addnewvalue", {
                classification: selectedOption,
                activity: activity,
            });
            if (remaninglen === 0) {
                const response = await api.post("/reclassify", parsedData);
                const updatedData = response.data.parsed;
                setParsedData(updatedData);

                // Persist the reclassified data to the stored file
                if (selectedFileId) {
                    await api.post(`/update-file-data/${selectedFileId}`, updatedData);
                }

                setShowClassifier(false);
            } else {
                setSelectedOption(null);
                setRemaningLen(remaninglen - 1);
            }
        } catch (error) {
            alert("Failed to save activity.");
        }
    }

    async function handleCreateNewClassification() {
        if (!newClassificationName.trim()) {
            alert("Please enter a classification name");
            return;
        }

        try {
            await api.post("/addnewclassification", {
                new_classification: newClassificationName.trim(),
                selected_activity: activity,
                chosen_type: transactionType.toLowerCase()
            });

            const endpoint = transactionType === "Income" ? "/income-options" : "/expense-options";
            const response = await api.get(endpoint);
            const newOptions = response.data.options;
            setOptions(newOptions);

            // Find the actual formatted classification name (e.g., "02 - CategoryName")
            const formattedName = newOptions.find((opt: string) =>
                opt.toLowerCase().includes(newClassificationName.trim().toLowerCase())
            );
            setSelectedOption(formattedName || newClassificationName.trim());
            setNewClassificationName("");
            setShowNewClassificationForm(false);

            alert("New classification created successfully!");
        } catch (error) {
            alert("Failed to create new classification.");
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-zinc-300">Loading classification options...</p>
                </div>
            </div>
        );
    }

    const progressPercentage = ((RemainingClassifications.length - remaninglen - 1) / RemainingClassifications.length) * 100;
    const incomeClass = "bg-green-100 text-green-800";
    const expenseClass = "bg-red-100 text-red-800";

    return (
        <div className="space-y-6">
            <div className="bg-primary-900/30 border border-primary-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                    {selectedOption ? `Selected: ${selectedOption}` : "Select Classification"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                        <p className="text-xs font-medium text-zinc-400 mb-1">Activity</p>
                        <p className="text-sm font-semibold text-white">{activity}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                        <p className="text-xs font-medium text-zinc-400 mb-1">Type</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transactionType === "Income" ? incomeClass : expenseClass
                        }`}>
                            {transactionType}
                        </span>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                        <p className="text-xs font-medium text-zinc-400 mb-1">Amount</p>
                        <p className="text-sm font-semibold text-white">${amt}</p>
                    </div>
                </div>

                <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                    <p className="text-sm text-zinc-300 mb-2">
                        Remaining: <span className="font-semibold text-primary-600">{remaninglen + 1}</span> of {RemainingClassifications.length}
                    </p>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                        <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {!showNewClassificationForm ? (
                <div className="space-y-4">
                    <DropDown
                        classifications={options}
                        showDropDown={true}
                        toggleDropDown={() => { }}
                        classificationSelection={(classification: string) => {
                            setSelectedOption(classification);
                        }}
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={!selectedOption}
                            className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save & Continue
                        </button>
                        <button
                            onClick={() => setShowNewClassificationForm(true)}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium"
                        >
                            Create New
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            New Classification Name
                        </label>
                        <input
                            type="text"
                            value={newClassificationName}
                            onChange={(e) => setNewClassificationName(e.target.value)}
                            placeholder={`Enter new ${transactionType.toLowerCase()} classification`}
                            className="w-full px-4 py-3 rounded-lg border border-zinc-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-white"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCreateNewClassification}
                            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium"
                        >
                            Create Classification
                        </button>
                        <button
                            onClick={() => {
                                setShowNewClassificationForm(false);
                                setNewClassificationName("");
                            }}
                            className="px-6 py-3 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg transition-colors duration-200 font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
