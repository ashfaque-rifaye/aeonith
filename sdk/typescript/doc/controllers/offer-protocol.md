# Offer Protocol

```ts
const offerProtocolApi = new OfferProtocolApi(client);
```

## Class Name

`OfferProtocolApi`

## Methods

* [List Open Demand](../../doc/controllers/offer-protocol.md#list-open-demand)
* [Get Demand](../../doc/controllers/offer-protocol.md#get-demand)
* [Commit Bid](../../doc/controllers/offer-protocol.md#commit-bid)
* [Reveal Bid](../../doc/controllers/offer-protocol.md#reveal-bid)
* [Get Result](../../doc/controllers/offer-protocol.md#get-result)


# List Open Demand

```ts
async listOpenDemand(
  requestOptions?: RequestOptions
): Promise<ApiResponse<DemandSignal[]>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Demand signals (no buyer limits, by construction)

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`DemandSignal[]`](../../doc/models/demand-signal.md).

## Example Usage

```ts
try {
  const response = await offerProtocolApi.listOpenDemand();

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


# Get Demand

```ts
async getDemand(
  requestId: string,
  requestOptions?: RequestOptions
): Promise<ApiResponse<DemandSignal>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Demand signal

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`DemandSignal`](../../doc/models/demand-signal.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

try {
  const response = await offerProtocolApi.getDemand(requestId);

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


# Commit Bid

hash = sha256(canonical JSON of the offer + salt). The offer itself is revealed later.

```ts
async commitBid(
  requestId: string,
  body: CommitBody,
  requestOptions?: RequestOptions
): Promise<ApiResponse<Commitment>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `body` | [`CommitBody`](../../doc/models/commit-body.md) | Body, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**201**: Commitment recorded

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`Commitment`](../../doc/models/commitment.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

const body: CommitBody = {
  providerId: 'providerId0',
  providerName: 'providerName0',
  hash: 'hash2',
};

try {
  const response = await offerProtocolApi.commitBid(
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
    if (error instanceof CustomError) {
      console.log(error.result);
    }
  }
}
```

## Errors

| HTTP Status Code | Error Description | Exception Class |
|  --- | --- | --- |
| 409 | Refused (policy gate, state or validation) | [`CustomError`](../../doc/models/custom-error.md) |


# Reveal Bid

```ts
async revealBid(
  requestId: string,
  body: RevealBody,
  requestOptions?: RequestOptions
): Promise<ApiResponse<ProtocolV1RequestsRevealsResponse>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `body` | [`RevealBody`](../../doc/models/reveal-body.md) | Body, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Whether the reveal matched its commitment

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`ProtocolV1RequestsRevealsResponse`](../../doc/models/protocol-v1-requests-reveals-response.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

const body: RevealBody = {
  offer: {
    requestId: 'requestId6',
    providerId: 'providerId2',
    priceCents: 9999000,
    minUnits: 236,
    promises: {
      licensed: false,
      warrantyMonths: 106,
      startAt: '2016-03-13T12:52:32.123Z',
    },
  },
  salt: 'salt8',
};

try {
  const response = await offerProtocolApi.revealBid(
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
    if (error instanceof CustomError) {
      console.log(error.result);
    }
  }
}
```

## Errors

| HTTP Status Code | Error Description | Exception Class |
|  --- | --- | --- |
| 409 | Refused (policy gate, state or validation) | [`CustomError`](../../doc/models/custom-error.md) |


# Get Result

```ts
async getResult(
  requestId: string,
  requestOptions?: RequestOptions
): Promise<ApiResponse<Result>>
```

## Parameters

| Parameter | Type | Tags | Description |
|  --- | --- | --- | --- |
| `requestId` | `string` | Template, Required | - |
| `requestOptions` | `RequestOptions \| undefined` | Optional | Pass additional request options. |

## Response Type

**200**: Result

This method returns an [`ApiResponse`](../../doc/api-response.md) instance. The `result` property of this instance returns the response data which is of type [`Result`](../../doc/models/result.md).

## Example Usage

```ts
const requestId = 'req_1601d47f';

try {
  const response = await offerProtocolApi.getResult(requestId);

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

