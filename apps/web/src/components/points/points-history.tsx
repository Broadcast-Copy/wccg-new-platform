"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PointsTransaction {
  id: string;
  date: string;
  description: string;
  points: number;
  type: "earn" | "redeem";
}

export function PointsHistory() {
  // TODO: Fetch points history from API
  const transactions: PointsTransaction[] = [];

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          No points transactions yet. Listen to streams and participate in
          events to earn points!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>{tx.date}</TableCell>
              <TableCell>{tx.description}</TableCell>
              <TableCell
                className={`text-right font-medium ${
                  tx.type === "earn" ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.type === "earn" ? "+" : "-"}
                {tx.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
