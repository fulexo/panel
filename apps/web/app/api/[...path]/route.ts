import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/');
    const url = new URL(`${API_BASE}/api/${path}`);
    
    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Copy authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Copy cookies for httpOnly authentication
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Copy other important headers
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (error) {
        // Ignore body parsing errors
      }
    }

    // Make the request to the backend
    const response = await fetch(url.toString(), requestOptions);

    // Get response data
    const contentType = response.headers.get('content-type') || 'application/json';
    
    // Check if response is binary (PDF, images, etc.)
    const isBinary = contentType.includes('application/pdf') || 
                     contentType.includes('image/') || 
                     contentType.includes('application/octet-stream') ||
                     contentType.includes('application/zip') ||
                     contentType.includes('application/x-');
    
    // Check if response is JSON (used in both binary and text branches)
    const isJson = contentType.includes('application/json');
    
    let responseData;
    let responseText;
    
    if (isBinary) {
      // Handle binary content
      const arrayBuffer = await response.arrayBuffer();
      responseData = Buffer.from(arrayBuffer);
    } else {
      // Handle text content
      responseText = await response.text();
      
      if (isJson) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
      } else {
        responseData = responseText;
      }
    }

    // Prepare response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
    };

    // Copy other important headers
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl) {
      responseHeaders['Cache-Control'] = cacheControl;
    }

    const etag = response.headers.get('etag');
    if (etag) {
      responseHeaders['ETag'] = etag;
    }

    const lastModified = response.headers.get('last-modified');
    if (lastModified) {
      responseHeaders['Last-Modified'] = lastModified;
    }

    // Copy Content-Disposition for file downloads
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      responseHeaders['Content-Disposition'] = contentDisposition;
    }

    // Copy Content-Length for binary content
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    // Copy Set-Cookie headers for authentication
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      // Create response based on content type
      const nextResponse = isBinary
        ? new NextResponse(responseData, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          })
        : isJson 
        ? NextResponse.json(responseData, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          })
        : new NextResponse(responseData, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          });
      
      // Set each Set-Cookie header
      setCookieHeaders.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
      
      return nextResponse;
    }

    // Return response with same content type
    if (isBinary) {
      return new NextResponse(responseData, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } else if (isJson) {
      return NextResponse.json(responseData, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } else {
      return new NextResponse(responseData, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

  } catch (error) {
    // API Proxy Error occurred
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}