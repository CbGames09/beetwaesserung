import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlantCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="w-full space-y-2">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-5 w-20 mx-auto" />
        </div>
        <div className="w-full space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  );
}

export function SensorCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-14 w-14 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SensorCardSkeleton />
          <SensorCardSkeleton />
          <SensorCardSkeleton />
        </div>

        <div>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PlantCardSkeleton />
            <PlantCardSkeleton />
            <PlantCardSkeleton />
            <PlantCardSkeleton />
          </div>
        </div>

        <div className="mt-12">
          <Skeleton className="h-8 w-40 mb-6" />
          <Card className="p-6">
            <Skeleton className="h-20 w-full" />
          </Card>
        </div>
      </main>
    </div>
  );
}
