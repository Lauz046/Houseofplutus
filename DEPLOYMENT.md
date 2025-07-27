# 🚀 House of Plutus Deployment Guide

## 📋 Prerequisites
- GitHub account with repository: https://github.com/Lauz046/Houseofplutus.git
- Render account (free tier available)
- Vercel account (free tier available)
- Neon database (PostgreSQL)

---

## 🔧 Step 1: Deploy Backend on Render

### 1.1 Set up Neon Database
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Get your database connection string (format: `postgresql://user:password@host/database`)

### 1.2 Deploy on Render
1. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Sign up/Login with your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `Lauz046/Houseofplutus`
   - Select the repository

3. **Configure the Service**
   ```
   Name: plutus-backend
   Root Directory: plutus-backend
   Environment: Go
   Build Command: go build -o server .
   Start Command: ./server
   ```

4. **Set Environment Variables**
   - Click "Environment" tab
   - Add these variables:
   ```
   NEON_DB_URL = your_neon_database_connection_string
   PORT = 10000
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (usually 2-3 minutes)

6. **Get Your Backend URL**
   - Once deployed, you'll get a URL like: `https://plutus-backend-xyz.onrender.com`
   - Save this URL for the frontend configuration

---

## 🌐 Step 2: Deploy Frontend on Vercel

### 2.1 Deploy on Vercel
1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/Login with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository: `Lauz046/Houseofplutus`
   - Select the repository

3. **Configure Project**
   ```
   Framework Preset: Next.js
   Root Directory: ./ (leave empty)
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Set Environment Variables**
   - Click "Environment Variables"
   - Add this variable:
   ```
   NEXT_PUBLIC_GRAPHQL_ENDPOINT = https://your-backend-url.onrender.com/query
   ```
   - Replace `your-backend-url` with your actual Render backend URL

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (usually 2-3 minutes)

6. **Get Your Frontend URL**
   - Once deployed, you'll get a URL like: `https://houseofplutus.vercel.app`

---

## 🔗 Step 3: Connect Frontend to Backend

### 3.1 Update Environment Variables
After both deployments are complete:

1. **In Vercel Dashboard**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Update `NEXT_PUBLIC_GRAPHQL_ENDPOINT` with your actual Render backend URL

2. **Redeploy Frontend**
   - Go to "Deployments" tab
   - Click "Redeploy" on the latest deployment

---

## 🧪 Step 4: Test Your Deployment

### 4.1 Test Backend
1. Visit your Render backend URL + `/query`
   - Example: `https://plutus-backend-xyz.onrender.com/query`
   - You should see the GraphQL playground

2. Test a simple query:
   ```graphql
   query {
     __typename
   }
   ```

### 4.2 Test Frontend
1. Visit your Vercel frontend URL
   - Example: `https://houseofplutus.vercel.app`
   - The website should load with all features working

### 4.3 Test API Endpoints
1. Test menu endpoint:
   - `https://your-backend-url.onrender.com/api/menu`

2. Test search endpoint:
   - `https://your-backend-url.onrender.com/api/search?q=test`

---

## 🔧 Troubleshooting

### Common Issues:

1. **Backend Build Fails**
   - Check if `go.mod` and `go.sum` are committed
   - Ensure all imports are correct
   - Check Render logs for specific errors

2. **Frontend Build Fails**
   - Check if all dependencies are in `package.json`
   - Ensure TypeScript errors are resolved
   - Check Vercel build logs

3. **Database Connection Issues**
   - Verify `NEON_DB_URL` is correct
   - Check if database is accessible from Render
   - Ensure database has the required tables

4. **CORS Issues**
   - Backend is already configured with CORS
   - If issues persist, check browser console for errors

5. **Environment Variables Not Working**
   - Ensure variables are set in both Render and Vercel
   - Redeploy after changing environment variables
   - Check variable names are exactly correct

---

## 📊 Monitoring

### Render Monitoring
- Go to your Render service dashboard
- Check "Logs" tab for any errors
- Monitor "Metrics" for performance

### Vercel Monitoring
- Go to your Vercel project dashboard
- Check "Functions" tab for API performance
- Monitor "Analytics" for user metrics

---

## 🔄 Updating Deployments

### Backend Updates
1. Push changes to GitHub
2. Render will automatically redeploy
3. Check Render logs for any issues

### Frontend Updates
1. Push changes to GitHub
2. Vercel will automatically redeploy
3. Check Vercel build logs for any issues

---

## 💰 Cost Considerations

### Render (Free Tier)
- 750 hours/month free
- Sleeps after 15 minutes of inactivity
- Perfect for development and small projects

### Vercel (Free Tier)
- Unlimited deployments
- 100GB bandwidth/month
- Perfect for frontend hosting

### Neon (Free Tier)
- 0.5GB storage
- 10GB transfer/month
- Perfect for development databases

---

## 🎉 Success!

Once all steps are completed, your House of Plutus application will be live at:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://your-backend.onrender.com`
- **GraphQL Playground**: `https://your-backend.onrender.com/query`

Your application is now fully deployed and accessible worldwide! 🌍 