# 🔧 Fix Dependencies Issue

## Problem
The `tsx` command is not found when running services.

## ✅ Solution Applied

I've updated all package.json files to use `npx tsx` instead of `tsx`. This will automatically download and use tsx if it's not installed locally.

## 🚀 Quick Fix

Run this command to install all dependencies:

```bash
cd /Users/arhansubasi/betfun-arena/betfun-arena

# Option 1: Install at root (recommended)
npm install tsx --save-dev

# Option 2: Install in each package
cd packages/api && npm install
cd ../websocket && npm install  
cd ../indexer && npm install
cd ../../apps/web && npm install
cd ../..
```

## 🎯 Then Run

```bash
npm run dev
```

## 📝 Alternative: Use Node Directly

If npm install continues to fail, you can modify the scripts to use `node --loader tsx` or install tsx globally:

```bash
npm install -g tsx
```

Then the original scripts will work.

---

**Status**: ✅ Scripts updated to use `npx tsx`  
**Next Step**: Install dependencies and run `npm run dev`

