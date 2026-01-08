# IZARA Telemedicine Platform - HTML Presentations

## 📊 Overview

This folder contains **interactive HTML presentations** of all IZARA telemedicine platform diagrams, optimized for **16:9 aspect ratio** displays with **large, readable text** and **professional styling**.

## 🎯 Features

- **16:9 Aspect Ratio**: Perfect for presentations and widescreen displays
- **Large, Bold Text**: Enhanced readability for presentations
- **Light, Professional Colors**: Easy on the eyes with modern gradients
- **Interactive Navigation**: Seamless browsing between presentations
- **Responsive Design**: Adapts to different screen sizes
- **Modern UI**: Clean, professional interface with smooth transitions
- **No Dependencies**: Self-contained HTML files (only requires internet for Mermaid.js CDN)

## 📁 File Structure

```
html-presentations/
├── index.html                        # Main landing page with all presentations
├── 01-system-architecture.html       # System overview
├── 02-patient-features.html          # Patient portal features
├── 03-doctor-features.html           # Doctor portal features
├── 04-appointment-workflow.html      # Appointment booking flow
├── 05-consultation-workflow.html     # Video consultation process
├── 06-emr-workflow.html              # EMR documentation
├── 07-prescribing-workflow.html      # E-prescribing system
├── 08-content-workflow.html          # Content management
├── 09-gcs-bucket-architecture.html   # Cloud storage structure
├── 10-gcp-services.html              # GCP integration
├── 11-google-services.html           # Google Workspace services
├── 12-lab-imaging-workflow.html      # Lab & imaging orders
├── 13-auth-workflow.html             # Authentication flow
├── 14-phr-workflow.html              # Personal health records
├── 15-healthcare-map-workflow.html   # Healthcare facility map
└── 16-data-sync-workflow.html        # Data synchronization
```

## 🚀 How to Use

### Method 1: Direct Browser Access
1. Open `index.html` in any modern web browser
2. Click on any presentation card to view the diagram
3. Use the navigation buttons to move between presentations

### Method 2: Presentation Mode
1. Open any HTML file directly in your browser
2. Press `F11` (or `Fn+F11` on Mac) for fullscreen mode
3. Use navigation buttons or arrow keys to browse

### Method 3: Web Server (Recommended for Development)
```powershell
# Using Python's built-in server
cd html-presentations
python -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Then open: http://localhost:8000
```

## 🎨 Customization

### Color Scheme
The presentations use a professional gradient color scheme:
- **Primary**: Purple gradient (#667eea → #764ba2)
- **Background**: White (#ffffff)
- **Text**: Dark gray (#2d3748)
- **Accents**: Various pastel colors for diagram elements

### Modifying Styles
Each HTML file contains embedded CSS. To customize:
1. Open any HTML file in a text editor
2. Locate the `<style>` section
3. Modify colors, fonts, or layout as needed
4. Save and refresh in browser

### Regenerating All Files
To regenerate all HTML presentations:
```powershell
cd Presentations
.\generate-html-presentations.ps1
```

## 📋 Presentation Categories

### System Architecture & Infrastructure
- **System Architecture**: Complete platform overview
- **GCS Bucket Architecture**: Cloud storage organization
- **GCP Services**: Google Cloud Platform integration
- **Google Services Integration**: Workspace services (Meet, Calendar, Maps, etc.)

### Portal Features
- **Patient Portal Features**: Patient-facing capabilities
- **Doctor Portal Features**: Clinical tools and features

### Core Workflows
- **Appointment Booking**: Scheduling system
- **Video Consultation**: Telemedicine session flow
- **EMR Documentation**: Electronic medical records
- **E-Prescribing**: Digital prescription system
- **Lab & Imaging Orders**: Order management

### Data Management
- **Authentication**: Security and access control
- **PHR Management**: Personal health records
- **Data Synchronization**: Real-time sync architecture
- **Medical Content Management**: Content workflow

### Additional Features
- **Healthcare Map**: Facility location service

## 🔧 Technical Details

### Technologies Used
- **HTML5**: Modern semantic markup
- **CSS3**: Flexbox, Grid, Gradients, Transitions
- **Mermaid.js**: Diagram rendering (v10+)
- **JavaScript**: Mermaid initialization

### Browser Compatibility
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

### Performance
- Fast loading (2-3 seconds with CDN)
- No heavy dependencies
- Optimized for presentation displays

## 📱 Responsive Behavior

The presentations adapt to different screen sizes:
- **Desktop (1920x1080+)**: Full 16:9 presentation mode
- **Laptop (1366x768)**: Scaled to fit with proper aspect ratio
- **Tablet (768x1024)**: Responsive layout with scrolling
- **Mobile (375x667)**: Stacked layout for readability

## 🎓 Best Practices for Presentations

1. **Fullscreen Mode**: Always use fullscreen (F11) for presentations
2. **Network Connection**: Ensure internet access for Mermaid.js CDN
3. **Screen Resolution**: Best viewed on 1920x1080 or higher
4. **Browser**: Use Chrome or Edge for best performance
5. **Preparation**: Pre-load all pages before presenting

## 🆘 Troubleshooting

### Diagrams Not Rendering
**Problem**: White space where diagram should be  
**Solution**: 
- Check internet connection (Mermaid.js requires CDN access)
- Try refreshing the page (Ctrl+F5)
- Ensure JavaScript is enabled

### Layout Issues
**Problem**: Text or elements overlapping  
**Solution**:
- Try zooming out (Ctrl + -)
- Refresh the page
- Try a different browser

### Slow Loading
**Problem**: Pages take long to load  
**Solution**:
- Check network speed
- Clear browser cache
- Close unnecessary browser tabs

## 📝 Notes

- All diagrams are sourced from the `diagrams/` folder
- Mermaid diagram syntax is embedded directly in HTML
- Navigation is automatic based on file naming
- All files are standalone and can be shared individually

## 🔄 Updates

To update presentations when diagrams change:
1. Modify the `.mmd` files in `diagrams/` folder
2. Run `generate-html-presentations.ps1`
3. New HTML files will be generated automatically
4. The index.html remains unchanged

## 📧 Support

For issues or questions about the presentations:
- Review the source `.mmd` files in `diagrams/`
- Check the generation script: `generate-html-presentations.ps1`
- Verify Mermaid.js syntax: https://mermaid.js.org/

## 📄 License

Part of the IZARA Telemedicine Platform project.

---

**Generated**: January 8, 2026  
**Version**: 1.1.8  
**Total Presentations**: 17 (16 diagrams + 1 index)  
**Tests Passing**: 378/378 (100%)
