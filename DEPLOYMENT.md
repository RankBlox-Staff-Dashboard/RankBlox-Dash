# Staff Hub - Web Deployment Guide

## Quick Start

The app has been built and is ready for deployment in the `dist/` folder.

## Deploying to ahscampus.com/staff

### Option A: Upload to Subdirectory

1. **Upload the `dist/` folder contents** to your web server at the `/staff/` directory:
   ```
   ahscampus.com/
   └── staff/
       ├── index.html
       ├── favicon.ico
       ├── metadata.json
       ├── _expo/
       │   └── static/
       │       └── js/
       │           └── web/
       │               └── index-*.js
       └── assets/
           └── ... (fonts and images)
   ```

2. **Configure your web server** to serve `index.html` for all routes under `/staff/`:

   **Apache (.htaccess in /staff/ folder):**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /staff/
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /staff/index.html [L]
   </IfModule>
   ```

   **Nginx:**
   ```nginx
   location /staff {
     alias /path/to/your/dist;
     try_files $uri $uri/ /staff/index.html;
   }
   ```

### Option B: Subdomain (staff.ahscampus.com)

1. Create a subdomain pointing to your server
2. Upload `dist/` contents to the subdomain's root
3. Configure the server to serve `index.html` for all routes

## Build Commands

```bash
# Build for root deployment (/)
npm run build:web

# Build for /staff subdirectory
npm run build:web:staff
```

## Testing Locally

After building, you can test the production build:

```bash
npx serve dist
```

Then open http://localhost:3000

## Default Login Credentials

- **Admin:** PIN `1234`
- **Staff:** PIN `5678`

## Storage Notes

- Data is stored in the browser's localStorage
- Each browser/device has its own separate data
- Clearing browser data will reset the app

## Updating the App

1. Make your changes
2. Run `npm run build:web`
3. Upload the new `dist/` folder contents to your server

## Troubleshooting

### Blank page after deployment
- Check browser console for errors
- Verify all files were uploaded
- Ensure the server is configured for SPA routing

### Assets not loading
- Check that the `assets/` and `_expo/` folders were uploaded
- Verify file permissions on the server

### Login not working
- Clear browser localStorage and try again
- Check browser console for errors
