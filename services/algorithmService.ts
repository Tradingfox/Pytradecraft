import { Algorithm } from '../types';

// API base URL - using a proxy prefix for Vite development
const API_BASE_URL = '/api';

/**
 * Get all algorithms for the current user
 * @param sessionToken Authentication token
 * @param page Page number for pagination
 * @param limit Number of items per page
 */
export const getAlgorithms = async (
  sessionToken: string,
  page: number = 1,
  limit: number = 10
): Promise<{ algorithms: Algorithm[], totalItems: number, totalPages: number, currentPage: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/algorithms?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch algorithms: ${response.status} ${response.statusText}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText.substring(0, 150));
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Non-JSON response:', responseText.substring(0, 150));
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the algorithms
    return await response.json();
  } catch (error) {
    console.error('Error fetching algorithms:', error);
    throw error;
  }
};

/**
 * Get a specific algorithm by ID
 * @param sessionToken Authentication token
 * @param algorithmId Algorithm ID to fetch
 */
export const getAlgorithm = async (
  sessionToken: string,
  algorithmId: string
): Promise<Algorithm> => {
  try {
    const response = await fetch(`${API_BASE_URL}/algorithms/${algorithmId}`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch algorithm: ${response.statusText}`);
      } else {
        // Get response text for better error messages
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText.substring(0, 150) + '...');
        throw new Error(`Failed to fetch algorithm: ${response.statusText} (${response.status})`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Get response text for better error messages
      const responseText = await response.text();
      console.error('Non-JSON response:', responseText.substring(0, 150) + '...');
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the algorithm
    return await response.json();
  } catch (error) {
    console.error('Error fetching algorithm:', error);
    throw error;
  }
};

/**
 * Create a new algorithm
 * @param sessionToken Authentication token
 * @param algorithm Algorithm data to create
 */
export const createAlgorithm = async (
  sessionToken: string,
  algorithm: { name: string, code: string, description: string }
): Promise<Algorithm> => {
  try {
    const response = await fetch(`${API_BASE_URL}/algorithms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(algorithm),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create algorithm: ${response.statusText}`);
      } else {
        // Get response text for better error messages
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText.substring(0, 150) + '...');
        throw new Error(`Failed to create algorithm: ${response.statusText} (${response.status})`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Get response text for better error messages
      const responseText = await response.text();
      console.error('Non-JSON response:', responseText.substring(0, 150) + '...');
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the created algorithm
    return await response.json();
  } catch (error) {
    console.error('Error creating algorithm:', error);
    throw error;
  }
};

/**
 * Update an existing algorithm
 * @param sessionToken Authentication token
 * @param algorithmId Algorithm ID to update
 * @param algorithm Updated algorithm data
 */
export const updateAlgorithm = async (
  sessionToken: string,
  algorithmId: string,
  algorithm: { name?: string, code?: string, description?: string }
): Promise<Algorithm> => {
  try {
    const response = await fetch(`${API_BASE_URL}/algorithms/${algorithmId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(algorithm),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update algorithm: ${response.statusText}`);
      } else {
        // Get response text for better error messages
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText.substring(0, 150) + '...');
        throw new Error(`Failed to update algorithm: ${response.statusText} (${response.status})`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Get response text for better error messages
      const responseText = await response.text();
      console.error('Non-JSON response:', responseText.substring(0, 150) + '...');
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the updated algorithm
    return await response.json();
  } catch (error) {
    console.error('Error updating algorithm:', error);
    throw error;
  }
};

/**
 * Delete an algorithm
 * @param sessionToken Authentication token
 * @param algorithmId Algorithm ID to delete
 */
export const deleteAlgorithm = async (
  sessionToken: string,
  algorithmId: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/algorithms/${algorithmId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete algorithm: ${response.statusText}`);
      } else {
        // Get response text for better error messages
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText.substring(0, 150) + '...');
        throw new Error(`Failed to delete algorithm: ${response.statusText} (${response.status})`);
      }
    }
  } catch (error) {
    console.error('Error deleting algorithm:', error);
    throw error;
  }
}; 