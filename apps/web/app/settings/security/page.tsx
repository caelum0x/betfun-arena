'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, Key, Lock, Smartphone, Download, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SecuritySettingsPage() {
  const { publicKey, connected } = useWallet();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sample QR code and secret (replace with actual implementation)
  const qrCodeUrl = '/placeholder-qr.png';
  const secret = 'JBSWY3DPEHPK3PXP';

  const handleEnable2FA = async () => {
    setShowSetup(true);
    // Call API to generate 2FA secret
    // const { secret, qrCodeUrl, backupCodes } = await generate2FA();
    setBackupCodes([
      'ABCD-1234',
      'EFGH-5678',
      'IJKL-9012',
      'MNOP-3456',
      'QRST-7890',
      'UVWX-1234',
      'YZAB-5678',
      'CDEF-9012',
    ]);
  };

  const handleVerify2FA = async () => {
    // Verify code with API
    if (verificationCode.length === 6) {
      setTwoFactorEnabled(true);
      setShowSetup(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h1 className="text-3xl font-bold mb-4">Security Settings</h1>
          <p className="text-gray-400">Connect your wallet to manage security settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Security Settings</h1>
        <p className="text-gray-400">Manage your account security and authentication</p>
      </div>

      {/* Current Security Status */}
      <div className="bg-gray-900 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-semibold">Security Status</h2>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Wallet Connected</span>
            <span className="text-green-500 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Verified
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Two-Factor Authentication</span>
            <span className={twoFactorEnabled ? 'text-green-500' : 'text-yellow-500'}>
              {twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Last Login</span>
            <span className="text-gray-300">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 2FA Setup */}
      {!twoFactorEnabled && !showSetup && (
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <Smartphone className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Enable Two-Factor Authentication</h2>
              <p className="text-gray-400 mb-4">
                Add an extra layer of security to your account by requiring a verification code in addition to your wallet signature.
              </p>
              <button
                onClick={handleEnable2FA}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Process */}
      {showSetup && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-6">Set Up Two-Factor Authentication</h2>

          {/* Step 1: Scan QR Code */}
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm">1</span>
              Scan QR Code
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="bg-white p-4 rounded-lg inline-block">
              <Image src={qrCodeUrl} alt="2FA QR Code" width={200} height={200} />
            </div>
          </div>

          {/* Step 2: Manual Entry */}
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm">2</span>
              Or Enter Manually
            </h3>
            <p className="text-gray-400 mb-2 text-sm">
              If you can't scan the QR code, enter this code manually:
            </p>
            <div className="flex items-center gap-2">
              <code className="px-4 py-2 bg-gray-800 rounded font-mono text-sm">
                {secret}
              </code>
              <button
                onClick={() => copyToClipboard(secret)}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                {copiedCode === secret ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Verify */}
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm">3</span>
              Verify Code
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
            <div className="flex gap-4">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
              <button
                onClick={handleVerify2FA}
                disabled={verificationCode.length !== 6}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                Verify
              </button>
            </div>
          </div>

          {/* Step 4: Backup Codes */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm">4</span>
              Save Backup Codes
            </h3>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <p className="text-yellow-500 text-sm mb-2 font-medium">⚠️ Important</p>
              <p className="text-sm text-gray-300">
                Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded font-mono text-sm"
                >
                  <span>{code}</span>
                  <button
                    onClick={() => copyToClipboard(code)}
                    className="ml-2 p-1 hover:bg-gray-700 rounded"
                  >
                    {copiedCode === code ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const text = backupCodes.join('\n');
                copyToClipboard(text);
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download All Codes
            </button>
          </div>
        </motion.div>
      )}

      {/* 2FA Enabled */}
      {twoFactorEnabled && (
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication Enabled</h2>
              <p className="text-gray-400 mb-4">
                Your account is protected with two-factor authentication.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Regenerate backup codes
                    setBackupCodes(generateNewBackupCodes());
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  Regenerate Backup Codes
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to disable 2FA?')) {
                      setTwoFactorEnabled(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg text-sm transition-colors"
                >
                  Disable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Recommendations */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Security Recommendations</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Use a Hardware Wallet</p>
              <p className="text-sm text-gray-400">
                For maximum security, use a hardware wallet like Ledger or Trezor
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Keep Software Updated</p>
              <p className="text-sm text-gray-400">
                Always use the latest version of your wallet software
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Never Share Your Private Keys</p>
              <p className="text-sm text-gray-400">
                BetFun Arena will never ask for your private keys or seed phrase
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate backup codes
function generateNewBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 8 }, () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

