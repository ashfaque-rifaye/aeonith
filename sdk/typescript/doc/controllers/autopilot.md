# Autopilot

PayPal Vault powered emergency jobs.

```ts
const autopilotApi = new AutopilotApi(client);
```

## Class Name

`AutopilotApi`

## Methods

* [List Autopilots](../../doc/controllers/autopilot.md#list-autopilots)
* [Create Autopilot](../../doc/controllers/autopilot.md#create-autopilot)
* [Sensor Alert](../../doc/controllers/autopilot.md#sensor-alert)


# List Autopilots

```ts
async listAutopilots(
  requestOptions?: RequestOptions
): Promise<ApiResponse<Autopilot[]>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Autopilots

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`Autopilot[]`](../../doc/models/autopilot.md).

## Example Usage

```ts
try {
  const response = await autopilotApi.listAutopilots();

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


# Create Autopilot

```ts
async createAutopilot(
  body: ApiAutopilotRequest,
  requestOptions?: RequestOptions
): Promise<ApiResponse<ApiAutopilotResponse>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `body` | [`ApiAutopilotRequest`](../../doc/models/api-autopilot-request.md) | Body, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Approve the setup token in PayPal

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`ApiAutopilotResponse`](../../doc/models/api-autopilot-response.md).

## Example Usage

```ts
const body: ApiAutopilotRequest = {
  capDollars: 253.62,
  categories: [
    Category.Plumbing,
    Category.Electrical
  ],
};

try {
  const response = await autopilotApi.createAutopilot(body);

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


# Sensor Alert

```ts
async sensorAlert(
  autopilotId: string,
  body: ApiAutopilotSensorRequest,
  requestOptions?: RequestOptions
): Promise<ApiResponse<RequestSummary>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `autopilotId` | `string` | Template, Required | - |
| `body` | [`ApiAutopilotSensorRequest`](../../doc/models/api-autopilot-sensor-request.md) | Body, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: The filed job, already funded and bid on

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`RequestSummary`](../../doc/models/request-summary.md).

## Example Usage

```ts
const autopilotId = 'autopilotId4';

const body: ApiAutopilotSensorRequest = {
  device: 'Leak sensor',
  location: 'Garage water heater',
  reading: 'Water detected on the floor',
};

try {
  const response = await autopilotApi.sensorAlert(
    autopilotId,
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

