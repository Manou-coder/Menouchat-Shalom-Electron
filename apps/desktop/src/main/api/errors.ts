/** Business-rule failures the API reports to the admin; anything else is a server error. */
export type AdminErrorCode = 'NOT_FOUND' | 'BAD_REQUEST' | 'PRECONDITION_FAILED';

export class AdminError extends Error {
  override readonly name = 'AdminError';

  constructor(
    readonly code: AdminErrorCode,
    message: string,
  ) {
    super(message);
  }
}
