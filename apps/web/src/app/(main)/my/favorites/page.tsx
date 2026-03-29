import { FavoritesList } from "@/components/favorites/favorites-list";

export const metadata = {
  title: "My Favorites | WCCG 104.5 FM",
};

export default function MyFavoritesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Favorites</h1>
        <p className="text-muted-foreground">
          Shows, streams, places, products, and events you have favorited
        </p>
      </div>
      <FavoritesList />
    </div>
  );
}
