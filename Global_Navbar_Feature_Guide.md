# Global Navbar Feature Guide

## Overview

The Global Navbar feature allows you to automatically add a navigation bar as the first component on every page in your project. This ensures consistent navigation across your entire website without manually adding a navbar to each page.

## How to Use

### 1. Enable Global Navbar

1. Open the **Pages** dropdown in the top toolbar
2. Click the **Settings** (gear) icon
3. In the "Global Navbar" section, toggle **"Add navbar to all pages"** to ON

### 2. Choose Navbar Type

You have three options for the global navbar:

#### Auto-Sync Navbar (Recommended)
- **Real-time synchronization**: Any changes you make to NavBar components automatically apply to all pages
- **No manual saving required**: Edit any navbar anywhere and it instantly updates globally
- **Perfect for live design**: Experiment with navbar styles and see changes across your entire site immediately

#### Default Navbar
- Uses a simple, clean navbar design
- Includes basic logo and navigation elements
- Automatically configured with standard styling

#### Custom Navbar (Manual)
1. Add a NavBar component to any page and customize it exactly how you want it to appear globally
2. In Project Settings, select "Custom Navbar" type
3. Click "Save Current NavBar Design" to capture your customized navbar
4. This design will now be used across all pages

### 3. How It Works

When global navbar is enabled:
- The navbar automatically appears as the **first component** on every page
- Any existing NavBar components on pages are automatically removed to prevent duplicates
- With **Auto-Sync mode** (recommended): Any navbar changes instantly sync across all pages
- With **Custom mode**: The navbar uses your saved design settings
- Navigation items are automatically pulled from your page structure

## Features

### Real-Time Auto-Sync (New!)
- **Instant updates**: Change any navbar on any page and it automatically updates everywhere
- **Live design**: Perfect for experimenting with navbar styles in real-time
- **No manual steps**: No need to manually save or update - it just works
- **Smart detection**: Automatically detects NavBar component changes every second

### Automatic Page Navigation
- The navbar automatically includes links to all your pages
- Supports hierarchical page structures (parent/child pages)
- Navigation items are automatically updated when you add/remove pages

### Consistent Styling
- Uses your project's design settings
- Maintains consistent appearance across all pages
- Respects your saved color schemes, fonts, and layout preferences

### Smart Duplicate Prevention
- Automatically removes any manually-added NavBar components when global navbar is enabled
- Prevents multiple navbars from appearing on the same page
- Ensures clean, consistent layout

## Best Practices

1. **Use Auto-Sync Mode**: For the best experience, use the Auto-Sync navbar type - just design once and edit anywhere
2. **Design First**: Create your perfect navbar design on any page, then enable global navbar with Auto-Sync
3. **Test in Preview**: Use the Preview mode to see how your global navbar looks across different pages
4. **Real-time Updates**: With Auto-Sync, you can edit the navbar on any page and immediately see it update everywhere
5. **Page Structure**: Organize your pages logically since the navbar will reflect your page hierarchy

## Technical Details

### Project Settings Storage
The global navbar settings are automatically saved in your project data:
- `globalNavbarSettings.enabled`: Whether the feature is active
- `globalNavbarSettings.navbarType`: "default", "auto-sync", or "custom"
- `globalNavbarSettings.navbarData`: Serialized navbar component data
- `globalNavbarSettings.autoSyncEnabled`: Whether auto-sync is enabled

### Auto-Sync Technology
The auto-sync feature works by:
1. Monitoring page changes every second for NavBar components
2. Detecting when NavBar component properties change
3. Automatically capturing the updated navbar design
4. Applying the changes to all pages in real-time
5. Maintaining consistency without manual intervention

### Page Processing
When loading any page with global navbar enabled:
1. The system checks if global navbar is enabled
2. Removes any existing NavBar components from the page
3. Injects the configured navbar as the first component
4. Maintains all other page content unchanged

## Troubleshooting

### Navbar Not Appearing
- Check that global navbar is enabled in Project Settings
- Ensure your project has been saved after enabling the feature
- If using Auto-Sync, try adding a NavBar component to any page first

### Auto-Sync Not Working
- Verify that "Auto-Sync Navbar" type is selected in settings
- Ensure you have a NavBar component on at least one page
- Check the browser console for any auto-sync related messages

### Custom Navbar Not Working
- Make sure you have a NavBar component on the current page before clicking "Save Current NavBar Design"
- Verify the navbar was saved successfully (you should see a success message)

### Multiple Navbars
- This shouldn't happen due to automatic duplicate removal
- If it occurs, try disabling and re-enabling the global navbar feature

## Integration with Other Features

### Preview Mode
- Global navbar works in the editor
- For preview mode functionality, additional development may be needed

### Export/Generation
- Global navbar settings are included when exporting projects
- The navbar structure is maintained in generated Next.js projects

### MediaLibrary Integration
- Custom navbars can include logos and images from the MediaLibrary
- All media references are preserved when saving navbar designs

---

This feature significantly streamlines website navigation management by ensuring every page has consistent navigation without manual duplication of effort.
