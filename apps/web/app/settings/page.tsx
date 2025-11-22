"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Wallet, 
  Key,
  Eye,
  EyeOff,
  Save,
  Trash2
} from "lucide-react";
import { motion } from "framer-motion";

interface UserSettings {
  profile: {
    username: string;
    bio: string;
    avatar: string;
    twitter: string;
    discord: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    orderFilled: boolean;
    marketResolved: boolean;
    marketEnding: boolean;
    achievements: boolean;
    newFollower: boolean;
    priceAlerts: boolean;
  };
  trading: {
    defaultSlippage: number;
    confirmTransactions: boolean;
    showBalances: boolean;
    autoApprove: boolean;
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
    showPositions: boolean;
    allowFollowers: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
}

export default function SettingsPage() {
  const { publicKey } = useWallet();
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      username: "CryptoTrader",
      bio: "Full-time prediction market trader",
      avatar: "👤",
      twitter: "@cryptotrader",
      discord: "cryptotrader#1234",
    },
    notifications: {
      email: true,
      push: true,
      orderFilled: true,
      marketResolved: true,
      marketEnding: true,
      achievements: true,
      newFollower: false,
      priceAlerts: true,
    },
    trading: {
      defaultSlippage: 1.0,
      confirmTransactions: true,
      showBalances: true,
      autoApprove: false,
    },
    privacy: {
      showProfile: true,
      showActivity: true,
      showPositions: false,
      allowFollowers: true,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
    },
  });

  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey] = useState("sk_live_51H...xyz");

  const handleSave = async () => {
    setLoading(true);
    // Save settings to API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    alert("Settings saved successfully!");
  };

  const handleGenerateApiKey = () => {
    alert("New API key generated!");
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      alert("Account deletion requested. You will receive a confirmation email.");
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
          <div className="text-center">
            <SettingsIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-slate-400">Connect your wallet to access settings</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your account preferences and security</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 mb-6">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="trading">
              <Wallet className="h-4 w-4 mr-2" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Eye className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your public profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Username</label>
                  <Input
                    value={settings.profile.username}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, username: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Bio</label>
                  <textarea
                    value={settings.profile.bio}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, bio: e.target.value }
                    })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Avatar Emoji</label>
                  <Input
                    value={settings.profile.avatar}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, avatar: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 text-white"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Twitter Handle</label>
                  <Input
                    value={settings.profile.twitter}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, twitter: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Discord</label>
                  <Input
                    value={settings.profile.discord}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, discord: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="username#1234"
                  />
                </div>

                <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, [key]: !value }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? "bg-blue-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Settings */}
          <TabsContent value="trading">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Trading Preferences</CardTitle>
                <CardDescription>Customize your trading experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    Default Slippage Tolerance (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.trading.defaultSlippage}
                    onChange={(e) => setSettings({
                      ...settings,
                      trading: { ...settings.trading, defaultSlippage: parseFloat(e.target.value) }
                    })}
                    className="bg-slate-800 border-slate-700 text-white"
                    min="0.1"
                    max="10"
                    step="0.1"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div>
                      <span className="text-white block">Confirm Transactions</span>
                      <span className="text-xs text-slate-400">Show confirmation dialog before trading</span>
                    </div>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        trading: { ...settings.trading, confirmTransactions: !settings.trading.confirmTransactions }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.trading.confirmTransactions ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.trading.confirmTransactions ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div>
                      <span className="text-white block">Show Balances</span>
                      <span className="text-xs text-slate-400">Display wallet balances in UI</span>
                    </div>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        trading: { ...settings.trading, showBalances: !settings.trading.showBalances }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.trading.showBalances ? "bg-blue-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.trading.showBalances ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control what others can see</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(settings.privacy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          privacy: { ...settings.privacy, [key]: !value }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? "bg-blue-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div>
                      <span className="text-white block font-medium">2FA Status</span>
                      <span className="text-sm text-slate-400">
                        {settings.security.twoFactorEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <Button
                      variant={settings.security.twoFactorEnabled ? "destructive" : "default"}
                      onClick={() => setSettings({
                        ...settings,
                        security: { ...settings.security, twoFactorEnabled: !settings.security.twoFactorEnabled }
                      })}
                    >
                      {settings.security.twoFactorEnabled ? "Disable" : "Enable"} 2FA
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API keys for programmatic access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={showApiKey ? apiKey : "••••••••••••••••"}
                      readOnly
                      className="bg-slate-800 border-slate-700 text-white flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="bg-slate-800 border-slate-700"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button onClick={handleGenerateApiKey} variant="outline" className="bg-slate-800 border-slate-700">
                    <Key className="h-4 w-4 mr-2" />
                    Generate New Key
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-900/20 to-slate-800 border-red-700/50">
                <CardHeader>
                  <CardTitle className="text-red-400">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

