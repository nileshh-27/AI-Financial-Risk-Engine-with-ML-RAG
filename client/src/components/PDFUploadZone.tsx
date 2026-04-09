import { useCallback, useState, useRef, useEffect } from "react";
import { Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PDFUploadZoneProps {
    onAnalyze: (files: File[]) => void;
    isLoading: boolean;
    isComplete?: boolean;
}

export function PDFUploadZone({ onAnalyze, isLoading, isComplete }: PDFUploadZoneProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clear files when analysis completes
    useEffect(() => {
        if (isComplete && !isLoading) {
            setFiles([]);
        }
    }, [isComplete, isLoading]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            (f) => f.type === "application/pdf"
        );
        setFiles((prev) => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        setFiles((prev) => [...prev, ...selectedFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleAnalyze = useCallback(() => {
        if (files.length > 0) {
            onAnalyze(files);
        }
    }, [files, onAnalyze]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="bg-card/40 backdrop-blur-xl border-white/5 shadow-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Bank Statements
                </CardTitle>
                <CardDescription>
                    Upload your bank statement PDFs to analyze spending patterns, detect recurring payments, and predict future expenses.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300 ease-out
            ${isDragging
                            ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                            : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                        }
          `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload-input"
                    />

                    <div className="flex flex-col items-center gap-3">
                        <div className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all
              ${isDragging ? "bg-primary/20 scale-110" : "bg-white/5"}
            `}>
                            <Upload className={`h-8 w-8 ${isDragging ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">
                                {isDragging ? "Drop PDFs here" : "Drag & drop bank statement PDFs"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                or click to browse • Supports Union Bank, HDFC, SBI, ICICI & more
                            </p>
                        </div>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                {files.length} file{files.length > 1 ? "s" : ""} selected
                            </p>
                            <Badge variant="outline" className="text-xs">
                                {files.length > 1 ? "Multi-year analysis" : "Single period"}
                            </Badge>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/20 border border-white/5 group hover:bg-white/5 transition-colors"
                                >
                                    <FileText className="h-4 w-4 text-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-white">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                    >
                                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info Banner */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-300/80">
                        Upload multiple years of statements for more accurate predictions. The model analyzes recurring payments, spending categories, and trends to forecast your next fiscal year.
                    </p>
                </div>

                {/* Analyze Button */}
                <Button
                    onClick={handleAnalyze}
                    disabled={files.length === 0 || isLoading}
                    className="w-full"
                    size="lg"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing Statements...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-5 w-5" />
                            Analyze {files.length > 0 ? `${files.length} Statement${files.length > 1 ? "s" : ""}` : "Statements"}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
