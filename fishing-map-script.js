// Configuration
const CONFIG = {
    // Option 1: Google Sheets CSV URL (publish your sheet as CSV)
    // Replace with your published Google Sheet CSV URL
    // To get this: File > Share > Publish to web > CSV format
    googleSheetsCSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1G0hbqKv6JwLue6MbWrkI-nOY6Pe2b5C3UZUuuHxMlSBiYRKq7M6A5-Mv7oBHsCaWbVlxraj3SSKJ/pub?output=csv',
    
    // Option 2: Google Sheets API (requires API key)
    // Uncomment and fill these if using API approach
    // googleSheetsAPI: {
    //     apiKey: 'YOUR_API_KEY',
    //     sheetId: 'YOUR_SHEET_ID',
    //     range: 'Sheet1!A:F' // Adjust based on your sheet name and range
    // },
    
    // Default map center (will be adjusted based on data)
    defaultCenter: [39.8283, -98.5795], // Center of United States
    defaultZoom: 4 // Full US view
};

// Initialize map
const map = L.map('map').setView(CONFIG.defaultCenter, CONFIG.defaultZoom);

// Add light grey tile layer (CartoDB Positron)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// Create and add legend
const createLegend = () => {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div class="legend-header">Legend</div>
            <div class="legend-item">
                <span class="legend-marker" style="background-color: #2ecc71;"></span>
                <span class="legend-label">Fish Caught</span>
            </div>
            <div class="legend-item">
                <span class="legend-marker" style="background-color: #95a5a6;"></span>
                <span class="legend-label">No Fish</span>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
};

// Initialize legend
createLegend();

// Data storage
let locationsData = [];
let markers = [];

// Color scheme for markers based on fish caught status
const getMarkerColor = (fishCaught) => {
    if (!fishCaught || fishCaught.toLowerCase().trim() === 'no' || fishCaught.toLowerCase().trim() === '') {
        return '#95a5a6'; // Gray for no fish
    }
    return '#2ecc71'; // Green for fish caught
};

// Create custom icon
const createIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20]
    });
};

// Format popup content
const createPopupContent = (data) => {
    const { 'Location Name': locationName, 'LAT': lat, 'LON': lon, 'Fish Caught?': fishCaught, 'Flies used': fliesUsed, 'Location Notes': locationNotes } = data;
    
    return `
        <div class="popup-header">${locationName || 'Unnamed Location'}</div>
        <div class="popup-content">
            <div class="popup-row">
                <span class="popup-label">Coordinates</span>
                <span class="popup-value">${lat}, ${lon}</span>
            </div>
            <div class="popup-row">
                <span class="popup-label">Fish Caught</span>
                <span class="popup-value ${!fishCaught || fishCaught.trim() === '' ? 'empty' : ''}">${fishCaught || 'Not specified'}</span>
            </div>
            <div class="popup-row">
                <span class="popup-label">Flies Used</span>
                <span class="popup-value ${!fliesUsed || fliesUsed.trim() === '' ? 'empty' : ''}">${fliesUsed || 'Not specified'}</span>
            </div>
            <div class="popup-row">
                <span class="popup-label">Notes</span>
                <span class="popup-value ${!locationNotes || locationNotes.trim() === '' ? 'empty' : ''}">${locationNotes || 'No notes'}</span>
            </div>
        </div>
    `;
};

// Helper to get value from row with flexible header matching
const getRowValue = (row, possibleKeys) => {
    for (const key of possibleKeys) {
        if (row.hasOwnProperty(key)) {
            return row[key];
        }
    }
    // Try case-insensitive match
    const rowKeys = Object.keys(row);
    for (const possibleKey of possibleKeys) {
        const found = rowKeys.find(k => k.toLowerCase().trim() === possibleKey.toLowerCase().trim());
        if (found) {
            return row[found];
        }
    }
    return undefined;
};

// Add markers to map
const addMarkers = (data) => {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    const bounds = [];
    let fishCaughtCount = 0;
    
    console.log('Adding markers for', data.length, 'rows');
    
    data.forEach((row, index) => {
        // Try multiple possible header formats
        const lat = parseFloat(getRowValue(row, ['LAT', 'Lat', 'lat', 'Latitude', 'latitude']));
        const lon = parseFloat(getRowValue(row, ['LON', 'Lon', 'lon', 'Longitude', 'longitude', 'LONG']));
        const locationName = getRowValue(row, ['Location Name', 'LocationName', 'location name', 'Location']);
        const fishCaught = getRowValue(row, ['Fish Caught?', 'FishCaught', 'Fish Caught', 'fish caught?']);
        const fliesUsed = getRowValue(row, ['Flies used', 'FliesUsed', 'Flies Used', 'flies used']);
        const locationNotes = getRowValue(row, ['Location Notes', 'LocationNotes', 'Location Notes', 'Notes', 'notes']);
        
        // Log first row for debugging
        if (index === 0) {
            console.log('Sample row data:', {
                'Location Name': locationName,
                'LAT': lat,
                'LON': lon,
                'Fish Caught?': fishCaught,
                'Flies used': fliesUsed,
                'Location Notes': locationNotes,
                'All keys': Object.keys(row)
            });
        }
        
        // Validate coordinates
        if (isNaN(lat) || isNaN(lon)) {
            console.warn(`Invalid coordinates for row ${index + 1} (${locationName}): LAT=${lat}, LON=${lon}`, row);
            return;
        }
        
        // Count fish caught
        if (fishCaught && fishCaught.toLowerCase().trim() !== 'no' && fishCaught.trim() !== '') {
            fishCaughtCount++;
        }
        
        // Create marker
        const color = getMarkerColor(fishCaught);
        const icon = createIcon(color);
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        
        // Create row object with normalized keys for popup
        const normalizedRow = {
            'Location Name': locationName || '',
            'LAT': lat.toString(),
            'LON': lon.toString(),
            'Fish Caught?': fishCaught || '',
            'Flies used': fliesUsed || '',
            'Location Notes': locationNotes || ''
        };
        
        // Add popup
        marker.bindPopup(createPopupContent(normalizedRow), {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        markers.push(marker);
        bounds.push([lat, lon]);
    });
    
    console.log(`Successfully added ${markers.length} markers`);
    
    // Fit map to bounds with smooth animation
    if (bounds.length > 0) {
        // Delay to show initial US view, then animate to locations with dramatic zoom
        setTimeout(() => {
            map.fitBounds(bounds, { 
                padding: [50, 50],
                animate: true,
                duration: 6
            });
        }, 800);
    }
};

// Fetch data from Google Sheets CSV with multiple proxy fallbacks
const fetchFromCSV = async (url) => {
    // List of CORS proxies to try
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        url // Direct fetch as last resort
    ];
    
    let lastError = null;
    
    for (let i = 0; i < proxies.length; i++) {
        const proxyUrl = proxies[i];
        const isDirect = i === proxies.length - 1;
        
        try {
            console.log(`Attempt ${i + 1}/${proxies.length}: ${isDirect ? 'Direct fetch' : 'CORS proxy'}`);
            console.log('URL:', proxyUrl);
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/csv'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            console.log('CSV text received (first 500 chars):', csvText.substring(0, 500));
            
            if (!csvText || csvText.trim().length === 0) {
                throw new Error('Received empty response from Google Sheets');
            }
            
            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (header) => {
                        // Trim whitespace from headers
                        return header.trim();
                    },
                    complete: (results) => {
                        console.log('Papa Parse complete. Rows:', results.data.length);
                        if (results.errors.length > 0) {
                            console.warn('CSV parsing errors:', results.errors);
                        }
                        if (results.data.length === 0) {
                            console.warn('No data rows found in CSV');
                        }
                        resolve(results.data);
                    },
                    error: (error) => {
                        console.error('Papa Parse error:', error);
                        reject(new Error(`Failed to parse CSV: ${error.message}`));
                    }
                });
            });
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            lastError = error;
            
            // If it's an abort (timeout), try next proxy
            if (error.name === 'AbortError') {
                console.log('Request timed out, trying next method...');
                continue;
            }
            
            // If it's a 408 or timeout error, try next proxy
            if (error.message.includes('408') || error.message.includes('timeout') || error.message.includes('Timeout')) {
                console.log('Timeout error, trying next method...');
                continue;
            }
            
            // For other errors, also try next proxy
            if (i < proxies.length - 1) {
                console.log('Trying next method...');
                continue;
            }
        }
    }
    
    // All methods failed
    throw new Error(`Failed to fetch data from Google Sheets after trying ${proxies.length} methods. Last error: ${lastError?.message || 'Unknown error'}. Please check that your sheet is published correctly and the URL is valid.`);
};

// Fetch data from Google Sheets API
const fetchFromAPI = async (config) => {
    const { apiKey, sheetId, range } = config;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch data');
        }
        
        // Convert API response to array of objects
        const [headers, ...rows] = data.values;
        return rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    } catch (error) {
        console.error('Error fetching from API:', error);
        throw error;
    }
};

// Show loading indicator
const showLoading = () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading fishing locations...</p>
    `;
    document.body.appendChild(loadingDiv);
};

// Hide loading indicator
const hideLoading = () => {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
};

// Demo data for fallback
const getDemoData = () => {
    return [
        {
            'Location Name': 'Demo Location 1',
            'LAT': '40.7128',
            'LON': '-74.0060',
            'Fish Caught?': 'Yes',
            'Flies used': 'Dry Fly, Nymph',
            'Location Notes': 'Great spot for trout'
        },
        {
            'Location Name': 'Demo Location 2',
            'LAT': '34.0522',
            'LON': '-118.2437',
            'Fish Caught?': 'No',
            'Flies used': '',
            'Location Notes': 'Need to try again'
        },
        {
            'Location Name': 'Demo Location 3',
            'LAT': '47.6062',
            'LON': '-122.3321',
            'Fish Caught?': 'Yes',
            'Flies used': 'Streamer, Woolly Bugger',
            'Location Notes': 'Excellent salmon fishing'
        }
    ];
};

// Load and display data
const loadData = async () => {
    showLoading();
    
    try {
        let data;
        let usingDemoData = false;
        
        console.log('Starting to load data...');
        console.log('CSV URL:', CONFIG.googleSheetsCSV);
        
        // Try to fetch from Google Sheets if URL is configured
        if (CONFIG.googleSheetsCSV) {
            console.log('Fetching from CSV...');
            data = await fetchFromCSV(CONFIG.googleSheetsCSV);
            console.log('Data fetched:', data);
            console.log('Number of rows:', data.length);
            if (data.length > 0) {
                console.log('First row:', data[0]);
                console.log('Column headers:', Object.keys(data[0]));
            }
        } else if (CONFIG.googleSheetsAPI) {
            try {
                data = await fetchFromAPI(CONFIG.googleSheetsAPI);
            } catch (fetchError) {
                console.warn('Failed to fetch from Google Sheets API, using demo data:', fetchError);
                data = getDemoData();
                usingDemoData = true;
            }
        } else {
            // No URL configured, use demo data
            console.warn('No Google Sheets URL configured. Using demo data.');
            data = getDemoData();
            usingDemoData = true;
        }
        
        if (!data || data.length === 0) {
            throw new Error('No data available');
        }
        
        // Filter out rows with invalid data
        const validData = data.filter(row => {
            const lat = parseFloat(getRowValue(row, ['LAT', 'Lat', 'lat', 'Latitude', 'latitude']));
            const lon = parseFloat(getRowValue(row, ['LON', 'Lon', 'lon', 'Longitude', 'longitude', 'LONG']));
            const isValid = !isNaN(lat) && !isNaN(lon);
            if (!isValid) {
                console.warn('Invalid row filtered out:', row);
            }
            return isValid;
        });
        
        console.log('Valid data rows:', validData.length);
        
        if (validData.length === 0) {
            throw new Error('No valid location data found. Please check that LAT and LON columns contain valid numbers.');
        }
        
        locationsData = validData;
        addMarkers(validData);
        hideLoading();
        
    } catch (error) {
        // Silently handle errors - just log to console and hide loading
        console.error('Error loading data:', error);
        hideLoading();
        
        // Silently fail - no error messages shown to users
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

