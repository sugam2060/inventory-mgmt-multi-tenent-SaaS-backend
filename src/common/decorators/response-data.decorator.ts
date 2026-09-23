import { SetMetadata } from '@nestjs/common';

export const INCLUDE_RESPONSE_DATA = 'include_response_data';

export const IncludeResponseData = () =>
  SetMetadata(INCLUDE_RESPONSE_DATA, true);
