#!/bin/bash

# BetFun Arena - Complete Deployment Script
# This script handles: Git commit, push to GitHub, and Vercel deployment

set -e

echo "🚀 BetFun Arena - Complete Deployment"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    echo "Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
fi

# Check git status
echo -e "${YELLOW}📋 Checking git status...${NC}"
git status --short

echo ""
read -p "Do you want to commit and push changes to GitHub? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add all changes
    echo -e "${YELLOW}📦 Adding files to git...${NC}"
    git add .
    
    # Check if there are changes to commit
    if git diff --staged --quiet; then
        echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    else
        # Commit
        echo -e "${YELLOW}💾 Committing changes...${NC}"
        git commit -m "feat: Add mock arenas, update deployment config, and prepare for Vercel deployment

- Add mock arenas for demonstration purposes
- Update .gitignore with comprehensive exclusions
- Add Vercel deployment configuration
- Add deployment scripts and documentation
- Update useAllArenas hook to show mock data when no real arenas exist"
        
        # Check if remote exists
        if git remote | grep -q "origin"; then
            echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
            CURRENT_BRANCH=$(git branch --show-current)
            git push origin "$CURRENT_BRANCH"
            echo -e "${GREEN}✅ Pushed to GitHub${NC}"
        else
            echo -e "${YELLOW}⚠️  No remote 'origin' found${NC}"
            echo "To add a remote, run:"
            echo "  git remote add origin <your-github-repo-url>"
            echo "  git push -u origin main"
        fi
    fi
fi

echo ""
echo -e "${YELLOW}🚀 Vercel Deployment${NC}"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to Vercel...${NC}"
    vercel login
fi

echo ""
read -p "Do you want to deploy to Vercel? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Important: Make sure environment variables are set in Vercel dashboard${NC}"
    echo ""
    echo "Required Environment Variables:"
    echo "  - NEXT_PUBLIC_SOLANA_RPC_URL"
    echo "  - NEXT_PUBLIC_PROGRAM_ID"
    echo "  - NEXT_PUBLIC_NETWORK"
    echo ""
    read -p "Continue with Vercel deployment? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
        vercel --prod
        
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo ""
        echo "📝 Next steps:"
        echo "  1. Set environment variables in Vercel dashboard if not already set"
        echo "  2. Visit your deployment URL"
        echo "  3. Test the application"
        echo ""
    fi
fi

echo ""
echo -e "${GREEN}✨ All done!${NC}"

