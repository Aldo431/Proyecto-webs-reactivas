// Single definition of the detail URL for a product id, shared by every
// card link. The detail page reads the id back from the URL with useParams.
export function productPath(productId: string): string {
  return `/producto/${productId}`;
}
