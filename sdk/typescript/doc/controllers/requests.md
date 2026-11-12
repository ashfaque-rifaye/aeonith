# Requests

Buyer requests, pools and PayPal holds.

```ts
const requestsApi = new RequestsApi(client);
```

## Class Name

`RequestsApi`

## Methods

* [List Requests](../../doc/controllers/requests.md#list-requests)
* [Create Job or Pool](../../doc/controllers/requests.md#create-job-or-pool)
* [Get Request](../../doc/controllers/requests.md#get-request)
* [Join Pool](../../doc/controllers/requests.md#join-pool)
* [Create Hold](../../doc/controllers/requests.md#create-hold)


# List Requests

```ts
async listRequests(
  requestOptions?: RequestOptions
): Promise<ApiResponse<RequestSummary[]>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Requests

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`RequestSummary[]`](../../doc/models/request-summary.md).

## Example Usage

```ts
try {
  const response = await requestsApi.listRequests();

  // Extracting fully parsed response body.
  console.log(response.result);

  // Extracting response status code.
  console.log(response.statusCode);
  // Extracting response headers.
  console.log(response.headers);
  // Extracting response body of type `string | Stream`
  console.log(response.body);
} catch (error) {
  if (error instanceof ApiError) {
    // Extracting response error status code.
    console.log(error.statusCode);
    // Extracting response error headers.
    console.log(error.headers);
    // Extracting response error body of type `string | Stream`.
    console.log(error.body);
  }
}
```


# Create Job or Pool

```ts
async createJobOrPool(
  body: CreateRequest,
  requestOptions?: RequestOptions
): Promise<ApiResponse<RequestSummary>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `body` | [`CreateRequest`](../../doc/models/create-request.md) | Body, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**201**: Created

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`RequestSummary`](../../doc/models/request-summary.md).

## Example Usage

```ts
const body: CreateRequest = {
  title: 'title8',
  category: 'category4',
};

try {
  const response = await requestsApi.createJobOrPool(body);

  // Extracting fully parsed response body.
  console.log(response.result);

  // Extracting response status code.
  console.log(response.statusCode);
  // Extracting response headers.
  console.log(response.headers);
  // Extracting response body of type `string | Stream`
  console.log(response.body);
} catch (error) {
  if (error instanceof ApiError) {
    // Extracting response error status code.
    console.log(error.statusCode);
    // Extracting response error headers.
    console.log(error.headers);
    // Extracting response error body of type `string | Stream`.
    console.log(error.body);
    if (error instanceof CustomError) {
      console.log(error.result);
    }
  }
}
```

## Errors

| HTTP Status Code | Error Description | Exception Class |
|  --- | --- | --- |
| 400 | Refused (policy gate, state or validation) | [`CustomError`](../../doc/models/custom-error.md) |


# Get Request

```ts
async getRequest(
  requestId: string,
  requestOptions?: RequestOptions
): Promise<ApiResponse<RequestSummary>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Request

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`RequestSummary`](../../doc/models/request-summary.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

try {
  const response = await requestsApi.getRequest(requestId);

  // Extracting fully parsed response body.
  console.log(response.result);

  // Extracting response status code.
  console.log(response.statusCode);
  // Extracting response headers.
  console.log(response.headers);
  // Extracting response body of type `string | Stream`
  console.log(response.body);
} catch (error) {
  if (error instanceof ApiError) {
    // Extracting response error status code.
    console.log(error.statusCode);
    // Extracting response error headers.
    console.log(error.headers);
    // Extracting response error body of type `string | Stream`.
    console.log(error.body);
  }
}
```


# Join Pool

```ts
async joinPool(
  requestId: string,
  body: ApiRequestsJoinRequest,
  requestOptions?: RequestOptions
): Promise<ApiResponse<Buyer>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `body` | [`ApiRequestsJoinRequest`](../../doc/models/api-requests-join-request.md) | Body, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Buyer added (pending until the PayPal hold is approved)

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`Buyer`](../../doc/models/buyer.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

const body: ApiRequestsJoinRequest = {
  name: 'name6',
  limitDollars: 97.86,
  units: 1,
};

try {
  const response = await requestsApi.joinPool(
    requestId,
    body
  );

  // Extracting fully parsed response body.
  console.log(response.result);

  // Extracting response status code.
  console.log(response.statusCode);
  // Extracting response headers.
  console.log(response.headers);
  // Extracting response body of type `string | Stream`
  console.log(response.body);
} catch (error) {
  if (error instanceof ApiError) {
    // Extracting response error status code.
    console.log(error.statusCode);
    // Extracting response error headers.
    console.log(error.headers);
    // Extracting response error body of type `string | Stream`.
    console.log(error.body);
  }
}
```


# Create Hold

```ts
async createHold(
  requestId: string,
  buyerId: string,
  requestOptions?: RequestOptions
): Promise<ApiResponse<ApiRequestsBuyersHoldResponse>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `buyerId` | `string` | Template, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: PayPal order; the buyer approves it in PayPal

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`ApiRequestsBuyersHoldResponse`](../../doc/models/api-requests-buyers-hold-response.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

const buyerId = 'buyerId6';

try {
  const response = await requestsApi.createHold(
    requestId,
    buyerId
  );

  // Extracting fully parsed response body.
  console.log(response.result);

  // Extracting response status code.
  console.log(response.statusCode);
  // Extracting response headers.
  console.log(response.headers);
  // Extracting response body of type `string | Stream`
  console.log(response.body);
} catch (error) {
  if (error instanceof ApiError) {
    // Extracting response error status code.
    console.log(error.statusCode);
    // Extracting response error headers.
    console.log(error.headers);
    // Extracting response error body of type `string | Stream`.
    console.log(error.body);
  }
}
```

