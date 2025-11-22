#!/bin/bash

# BetFun Arena - Vercel Deployment Script

set -e

echo "🚀 BetFun Arena - Vercel Deployment"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

echo "✅ Vercel CLI ready"
echo ""

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Deployment Checklist:"
echo "  1. ✅ Vercel CLI installed"
echo "  2. ✅ Logged in to Vercel"
echo "  3. ⚠️  Make sure environment variables are set in Vercel dashboard"
echo ""
echo "Required Environment Variables:"
echo "  - NEXT_PUBLIC_SOLANA_RPC_URL"
echo "  - NEXT_PUBLIC_PROGRAM_ID"
echo "  - NEXT_PUBLIC_NETWORK"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Deploying to Vercel..."
echo ""

# Deploy
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Set environment variables in Vercel dashboard if not already set"
echo "  2. Visit your deployment URL"
echo "  3. Test the application"
echo ""

