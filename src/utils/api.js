
// handles api requests with the backend
async function fetchApiCall({ url, method, body = null, header, signal = null, successCallback = null, failCallback = handleError }) {

  const defaultHeader = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  const config = {
    method: method,
    headers: header ? header : defaultHeader,
    body: body ? JSON.stringify(body) : null,
    signal: signal
  }

  try {
    const response = await fetch(url, config)
    // ok response but empty content
    if (response.ok && (!response.headers.has('content-length') || response.headers.get('content-length') == 0)) {
      successCallback ? successCallback(null) : null
    } else {
      const responseData = await response.json()
      if (!response.ok) {
        failCallback ? failCallback(responseData, response.status) : null
      } else {
        // Invoking success callback with responseData
        successCallback ? successCallback(responseData) : null
      }
      return responseData
    }
  } catch (error) {
    failCallback ? failCallback(error) : null
  }
}
  
// manages api call failures by logging errors
const handleError = (response) => {
  let error = response.error || response;
  console.error('API call failed with error:', error)
}

export { fetchApiCall, handleError }