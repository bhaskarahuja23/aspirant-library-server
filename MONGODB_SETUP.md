# MongoDB Atlas Setup Instructions

## Quick Setup (5 minutes)

1. **Create Free MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up with Google/GitHub or email
   - Choose "Free" tier (M0 Sandbox - 512MB)

2. **Create a Cluster**
   - Click "Build a Database"
   - Select **FREE** tier (M0)
   - Choose a region close to your Render server (e.g., AWS US East)
   - Click "Create"

3. **Setup Database Access**
   - Go to "Database Access" (left sidebar)
   - Click "Add New Database User"
   - Username: `aspirant-admin`
   - Password: Generate a secure password (copy it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Setup Network Access**
   - Go to "Network Access" (left sidebar)
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Confirm

5. **Get Connection String**
   - Go to "Database" (left sidebar)
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string, it looks like:
     ```
     mongodb+srv://aspirant-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the password you created in step 3

6. **Add to Render Environment Variables**
   - Go to your Render dashboard: https://dashboard.render.com
   - Select your `aspirant-library-server` service
   - Go to "Environment" tab
   - Click "Add Environment Variable"
   - Key: `MONGODB_URI`
   - Value: Paste your connection string (with password replaced)
   - Click "Save Changes"

7. **Redeploy**
   - Render will automatically redeploy with the new environment variable
   - Check logs to verify: "✓ MongoDB connected successfully"

## Done! 🎉

Your seat data will now persist permanently in MongoDB Atlas (free forever, 512MB storage).
