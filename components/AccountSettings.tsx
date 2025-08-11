import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TranslationHistory } from './TranslationHistory';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Settings, 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Camera,
  Save,
  LogOut,
  History,
  Shield,
  Download,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { User } from '../types';

interface AccountSettingsProps {
  user: User | null;
  onUpdateUser: (user: User) => void;
  onSignOut: () => void;
  onBack: () => void;
}

export function AccountSettings({ user, onUpdateUser, onSignOut, onBack }: AccountSettingsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <UserIcon className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h2 className="text-2xl font-light text-white mb-2">Not signed in</h2>
          <p className="text-white/70 mb-6">Please sign in to access your settings</p>
          <Button onClick={onBack} className="bg-white/20 hover:bg-white/30 text-white">
            Go back
          </Button>
        </motion.div>
      </div>
    );
  }

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedUser = {
      ...user,
      name: profileData.name,
      email: profileData.email,
      settings: {
        ...user.settings,
        voiceSettings: user.settings.voiceSettings || {
          speed: 1.0,
          pitch: 1.0,
          voice: 'alloy'
        }
      }
    };
    
    onUpdateUser(updatedUser);
    setIsLoading(false);
  };

  const handleSettingChange = (key: string, value: boolean | string) => {
    const updatedUser = {
      ...user,
      settings: {
        ...user.settings,
        [key]: value,
        voiceSettings: user.settings.voiceSettings || {
          speed: 1.0,
          pitch: 1.0,
          voice: 'alloy'
        }
      },
    };
    onUpdateUser(updatedUser);
  };

  const handleDeleteAccount = () => {
    // In a real app, this would show a confirmation dialog
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      onSignOut();
    }
  };

  const handleExportData = () => {
    // Mock data export
    const data = {
      user: user,
      exportedAt: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'verbio-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white/80 hover:text-white mr-4"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-light text-white">Account Settings</h1>
            <p className="text-white/70 mt-1">Manage your Verbio experience</p>
          </div>
        </motion.div>

        {/* Settings Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-1 h-auto">
              <TabsTrigger 
                value="profile" 
                className="rounded-xl py-3 text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white"
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="preferences"
                className="rounded-xl py-3 text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="rounded-xl py-3 text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger 
                value="privacy"
                className="rounded-xl py-3 text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-white/20 backdrop-blur-md border-white/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                      <p className="text-white/60 text-sm mt-2">
                        Upload a profile picture
                      </p>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/90">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/90">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                    />
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    {isLoading ? (
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <div className="grid gap-6">
                {/* Appearance */}
                <Card className="bg-white/20 backdrop-blur-md border-white/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Monitor className="h-5 w-5 mr-2" />
                      Appearance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white/90">Theme</Label>
                        <p className="text-white/60 text-sm">Choose your preferred theme</p>
                      </div>
                      <Select
                        value={user.settings.theme}
                        onValueChange={(value) => handleSettingChange('theme', value)}
                      >
                        <SelectTrigger className="w-32 bg-white/10 border-white/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-md">
                          <SelectItem value="light">
                            <div className="flex items-center">
                              <Sun className="h-4 w-4 mr-2" />
                              Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center">
                              <Moon className="h-4 w-4 mr-2" />
                              Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center">
                              <Monitor className="h-4 w-4 mr-2" />
                              System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Language */}
                <Card className="bg-white/20 backdrop-blur-md border-white/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Globe className="h-5 w-5 mr-2" />
                      Language & Translation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white/90">Interface Language</Label>
                        <p className="text-white/60 text-sm">Language for the app interface</p>
                      </div>
                      <Select
                        value={user.settings.language}
                        onValueChange={(value) => handleSettingChange('language', value)}
                      >
                        <SelectTrigger className="w-32 bg-white/10 border-white/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-md">
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white/90">Auto-translate</Label>
                        <p className="text-white/60 text-sm">Automatically detect and translate text</p>
                      </div>
                      <Switch
                        checked={user.settings.autoTranslate}
                        onCheckedChange={(checked) => handleSettingChange('autoTranslate', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="bg-white/20 backdrop-blur-md border-white/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white/90">Push Notifications</Label>
                        <p className="text-white/60 text-sm">Receive notifications about translations</p>
                      </div>
                      <Switch
                        checked={user.settings.notifications}
                        onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card className="bg-white/20 backdrop-blur-md border-white/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <History className="h-5 w-5 mr-2" />
                    Translation History Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white/90">Save History</Label>
                      <p className="text-white/60 text-sm">Keep a record of your translations</p>
                    </div>
                    <Switch
                      checked={user.settings.saveHistory}
                      onCheckedChange={(checked) => handleSettingChange('saveHistory', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Translation History Component */}
              <TranslationHistory
                translations={[]}
                onDeleteTranslation={(id) => console.log('Delete translation:', id)}
                onToggleFavorite={(id) => console.log('Toggle favorite:', id)}
              />
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <div className="grid gap-6">
                {/* Data & Privacy */}
                <Card className="bg-white/20 backdrop-blur-md border-white/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Data & Privacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleExportData}
                      variant="outline"
                      className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                    
                    <div className="border-t border-white/20 pt-4">
                      <p className="text-white/70 text-sm mb-4">
                        This will permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button
                        onClick={handleDeleteAccount}
                        variant="destructive"
                        className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:text-red-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Sign Out */}
                <Card className="bg-white/20 backdrop-blur-md border-white/30">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <LogOut className="h-5 w-5 mr-2" />
                      Account Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={onSignOut}
                      variant="outline"
                      className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}