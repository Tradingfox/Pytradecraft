import { Algorithm, AlgorithmDeployment, DeploymentStatus, DeploymentParams } from '../types';

// API base URL - using a proxy prefix for Vite development
const API_BASE_URL = '/api';

/**
 * Get all deployments for the current user
 */
export const getAllDeployments = async (
  sessionToken: string
): Promise<{ deployments: AlgorithmDeployment[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/deployments`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      let errorMessage = `Failed to get deployments: ${response.status} ${response.statusText}`;
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

    // If the response is an array, wrap it in an object
    const data = await response.json();
    return Array.isArray(data) ? { deployments: data } : data;
  } catch (error) {
    console.error('Error getting deployments:', error);
    throw error;
  }
};

/**
 * Deploy an algorithm to a single account
 */
export const deployAlgorithm = async (
  sessionToken: string,
  algorithmId: string,
  accountId: string | number,
  params?: DeploymentParams
): Promise<AlgorithmDeployment> => {
  try {
    // API endpoint would be implemented here
    console.log('Deploying algorithm', algorithmId, 'to account', accountId, 'with params', params);
    
    // Real API call
    const response = await fetch(`${API_BASE_URL}/deployments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        algorithmId,
        accountId,
        parameters: params || {},
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to deploy algorithm: ${response.statusText}`);
      } else {
        // Get response text for better error messages
        const errorText = await response.text();
        console.error('Non-JSON error response:', errorText.substring(0, 150) + '...');
        throw new Error(`Failed to deploy algorithm: ${response.statusText} (${response.status})`);
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

    // Return the deployment information
    return await response.json();
  } catch (error) {
    console.error('Error deploying algorithm:', error);
    throw error;
  }
};

/**
 * Deploy an algorithm to multiple accounts
 */
export const deployAlgorithmToMultipleAccounts = async (
  sessionToken: string,
  algorithmId: string,
  accountIds: (string | number)[],
  params?: DeploymentParams
): Promise<Record<string | number, AlgorithmDeployment | Error>> => {
  const results: Record<string | number, AlgorithmDeployment | Error> = {};

  // Deploy to each account sequentially
  for (const accountId of accountIds) {
    try {
      const deployment = await deployAlgorithm(sessionToken, algorithmId, accountId, params);
      results[accountId] = deployment;
    } catch (error) {
      results[accountId] = error instanceof Error ? error : new Error(String(error));
    }
  }

  return results;
};

/**
 * Get the status of a deployed algorithm
 */
export const getDeploymentStatus = async (
  sessionToken: string,
  deploymentId: string
): Promise<DeploymentStatus> => {
  try {
    const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/status`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get deployment status: ${response.statusText}`);
      } else {
        throw new Error(`Failed to get deployment status: ${response.statusText}`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the deployment status
    return await response.json();
  } catch (error) {
    console.error('Error getting deployment status:', error);
    throw error;
  }
};

/**
 * Get all deployments for an algorithm
 */
export const getAlgorithmDeployments = async (
  sessionToken: string,
  algorithmId: string
): Promise<AlgorithmDeployment[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/algorithms/${algorithmId}/deployments`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get algorithm deployments: ${response.statusText}`);
      } else {
        throw new Error(`Failed to get algorithm deployments: ${response.statusText}`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the deployments
    return await response.json();
  } catch (error) {
    console.error('Error getting algorithm deployments:', error);
    throw error;
  }
};

/**
 * Get all deployments for an account
 */
export const getAccountDeployments = async (
  sessionToken: string,
  accountId: string | number
): Promise<AlgorithmDeployment[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/deployments`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get account deployments: ${response.statusText}`);
      } else {
        throw new Error(`Failed to get account deployments: ${response.statusText}`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the deployments
    return await response.json();
  } catch (error) {
    console.error('Error getting account deployments:', error);
    throw error;
  }
};

/**
 * Stop a deployed algorithm
 */
export const stopDeployment = async (
  sessionToken: string,
  deploymentId: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to stop deployment: ${response.statusText}`);
      } else {
        throw new Error(`Failed to stop deployment: ${response.statusText}`);
      }
    }
  } catch (error) {
    console.error('Error stopping deployment:', error);
    throw error;
  }
};

/**
 * Delete a deployment
 */
export const deleteDeployment = async (
  sessionToken: string,
  deploymentId: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete deployment: ${response.statusText}`);
      } else {
        throw new Error(`Failed to delete deployment: ${response.statusText}`);
      }
    }
  } catch (error) {
    console.error('Error deleting deployment:', error);
    throw error;
  }
};

/**
 * Extract deployment parameters from algorithm code
 */
export const extractDeploymentParameters = (code: string): Record<string, string> => {
  const params: Record<string, string> = {};
  
  // Look for parameters in comments or variable declarations
  // Format: # Parameter: name = default_value
  const paramRegex = /# *Parameter: *([a-zA-Z0-9_]+) *= *([^#\n]*)/g;
  let match;
  
  while ((match = paramRegex.exec(code)) !== null) {
    if (match[1] && match[2]) {
      params[match[1]] = match[2].trim();
    }
  }
  
  return params;
};

/**
 * Get deployment logs
 */
export const getDeploymentLogs = async (
  sessionToken: string,
  deploymentId: string,
  limit: number = 100,
  offset: number = 0
): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/deployments/${deploymentId}/logs?limit=${limit}&offset=${offset}`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get deployment logs: ${response.statusText}`);
      } else {
        throw new Error(`Failed to get deployment logs: ${response.statusText}`);
      }
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid server response format. Expected JSON.');
    }

    // Return the logs
    const data = await response.json();
    return data.logs;
  } catch (error) {
    console.error('Error getting deployment logs:', error);
    throw error;
  }
}; 