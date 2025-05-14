// backend.js - Example implementation of a simple backend for VK Cloud
// This would run on your server, not in the VK Mini App

const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk'); // AWS SDK works with S3-compatible APIs like VK Cloud
const app = express();

// Enable CORS for VK domains
app.use(cors({
  origin: [/\.vk\.com$/, 'https://vk.com'],
  methods: ['GET', 'HEAD'],
  credentials: false
}));

// VK Cloud credentials - store these securely using environment variables
// in a real production environment
const VK_CLOUD_CONFIG = {
  accessKey: process.env.VK_CLOUD_ACCESS_KEY,
  secretKey: process.env.VK_CLOUD_SECRET_KEY,
  bucketName: process.env.VK_CLOUD_BUCKET_NAME || 'your-bucket-name',
  region: 'ru-msk',
  endpointUrl: 'https://hb.bizmrg.com'
};

// Configure AWS SDK to work with VK Cloud
const s3 = new AWS.S3({
  accessKeyId: VK_CLOUD_CONFIG.accessKey,
  secretAccessKey: VK_CLOUD_CONFIG.secretKey,
  endpoint: VK_CLOUD_CONFIG.endpointUrl,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: VK_CLOUD_CONFIG.region
});

// Endpoint to get a signed URL for secure access
app.get('/api/getSignedUrl', async (req, res) => {
  try {
    const objectKey = req.query.key;
    
    if (!objectKey) {
      return res.status(400).json({ error: 'Missing object key parameter' });
    }
    
    // Create a signed URL that expires in 1 hour
    const url = s3.getSignedUrl('getObject', {
      Bucket: VK_CLOUD_CONFIG.bucketName,
      Key: objectKey,
      Expires: 3600 // URL expires in 1 hour
    });
    
    res.json({ url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

// Endpoint to list objects in a "directory" (common prefix)
app.get('/api/listObjects', async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    const delimiter = req.query.delimiter || '/';
    
    const params = {
      Bucket: VK_CLOUD_CONFIG.bucketName,
      Prefix: prefix,
      Delimiter: delimiter
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    // Format the response
    const result = {
      folders: data.CommonPrefixes ? data.CommonPrefixes.map(p => p.Prefix) : [],
      files: data.Contents ? data.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified
      })) : []
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error listing objects:', error);
    res.status(500).json({ error: 'Failed to list objects' });
  }
});

// Endpoint to get a file's content (text files only, for binary use signed URLs)
app.get('/api/getTextFile', async (req, res) => {
  try {
    const objectKey = req.query.key;
    
    if (!objectKey) {
      return res.status(400).json({ error: 'Missing object key parameter' });
    }
    
    const params = {
      Bucket: VK_CLOUD_CONFIG.bucketName,
      Key: objectKey
    };
    
    const data = await s3.getObject(params).promise();
    const textContent = data.Body.toString('utf-8');
    
    res.send(textContent);
  } catch (error) {
    console.error('Error fetching text file:', error);
    res.status(500).json({ error: 'Failed to fetch text file' });
  }
});

// Endpoint to get case series information
app.get('/api/getCaseSeries', async (req, res) => {
  try {
    const caseId = req.query.caseId;
    
    if (!caseId) {
      return res.status(400).json({ error: 'Missing case ID parameter' });
    }
    
    const modesPrefix = `radiocases/${caseId}/modes/`;
    
    // List directories in the modes folder
    const params = {
      Bucket: VK_CLOUD_CONFIG.bucketName,
      Prefix: modesPrefix,
      Delimiter: '/'
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    // Extract series names from prefixes
    const series = data.CommonPrefixes.map(prefix => {
      // Extract series name from the path
      // e.g., "radiocases/case1/modes/T1_SAG/" -> "T1_SAG"
      const path = prefix.Prefix;
      return path.substring(modesPrefix.length, path.length - 1);
    });
    
    res.json({ series });
  } catch (error) {
    console.error('Error getting case series:', error);
    res.status(500).json({ error: 'Failed to get case series' });
  }
});

// Endpoint to get all cases
app.get('/api/getAllCases', async (req, res) => {
  try {
    const params = {
      Bucket: VK_CLOUD_CONFIG.bucketName,
      Prefix: 'radiocases/',
      Delimiter: '/'
    };
    
    const data = await s3.listObjectsV2(params).promise();
    
    // Extract case IDs from the prefixes
    const cases = [];
    
    for (const prefix of data.CommonPrefixes) {
      const caseId = prefix.Prefix.split('/')[1];
      
      // Try to get the title.txt content for each case
      try {
        const titleParams = {
          Bucket: VK_CLOUD_CONFIG.bucketName,
          Key: `radiocases/${caseId}/title.txt`
        };
        
        const titleData = await s3.getObject(titleParams).promise();
        const title = titleData.Body.toString('utf-8').trim();
        
        cases.push({
          id: caseId,
          title: title || `Case ${caseId}`
        });
      } catch (error) {
        // If title.txt doesn't exist, use default title
        cases.push({
          id: caseId,
          title: `Case ${caseId}`
        });
      }
    }
    
    res.json({ cases });
  } catch (error) {
    console.error('Error getting all cases:', error);
    res.status(500).json({ error: 'Failed to get all cases' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
