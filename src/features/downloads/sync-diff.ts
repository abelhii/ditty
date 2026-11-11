/** Track ids a collection holds locally that the server no longer lists — to be released. Ids the
 *  server lists but the collection lacks are not returned: those are (re-)requested by enqueueing the
 *  server's whole list, which skips anything already downloaded. */
export function staleMembers(memberIds: string[], serverIds: string[]): string[] {
  const onServer = new Set(serverIds);
  return memberIds.filter((id) => !onServer.has(id));
}
