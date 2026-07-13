import React, { useEffect, useState } from "react";
import { Mail, Plus, X, Save, ShieldCheck } from "lucide-react";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input/Input";
import systemSettingsService from "../../../services/systemSettingsService";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

const SystemSettings: React.FC = () => {
    const [emails, setEmails] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const setting = await systemSettingsService.getSettingByKey("leave_notification_emails");
            if (setting && Array.isArray(setting.value)) {
                setEmails(setting.value);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            // Don't show error toast if not found (might not be created yet)
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEmail = () => {
        if (!newEmail) return;
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
            toast.error("Please enter a valid email address");
            return;
        }
        if (emails.includes(newEmail)) {
            toast.error("Email already added");
            return;
        }
        setEmails([...emails, newEmail]);
        setNewEmail("");
    };

    const handleRemoveEmail = (email: string) => {
        setEmails(emails.filter((e) => e !== email));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await systemSettingsService.updateSetting({
                key: "leave_notification_emails",
                value: emails,
                description: "Additional email addresses to receive leave application notifications"
            });
            toast.success("Settings saved successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner fullScreen />;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    System Settings
                </h1>
                <p className="text-foreground-secondary">
                    Configure global application parameters and notification workflows.
                </p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Leave Approval Workflow
                    </h2>
                    <p className="text-sm text-foreground-tertiary mt-1">
                        Configure additional email addresses that should receive leave application notifications.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Input
                                placeholder="Enter email address (e.g. admin@company.com)"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                                startAdornment={<Mail className="w-4 h-4" />}
                            />
                        </div>
                        <Button onClick={handleAddEmail} variant="secondaryOutline" className="h-[42px]">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Email
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                            Configured Email Addresses
                        </label>
                        {emails.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-foreground-tertiary">
                                No additional email addresses configured.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {emails.map((email) => (
                                    <div 
                                        key={email} 
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border group"
                                    >
                                        <span className="text-sm font-medium">{email}</span>
                                        <button 
                                            onClick={() => handleRemoveEmail(email)}
                                            className="p-1 hover:bg-error/10 hover:text-error rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                    <Button 
                        onClick={handleSave} 
                        isLoading={isSaving}
                        className="min-w-[140px]"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default SystemSettings;
