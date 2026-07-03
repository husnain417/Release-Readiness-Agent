import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ReviewEvent, ToolCall } from "@/lib/types";

interface ReviewTraceProps {
  events: ReviewEvent[];
  toolCalls: ToolCall[];
}

export function ReviewTrace({ events, toolCalls }: ReviewTraceProps) {
  if (events.length === 0 && toolCalls.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent trace</CardTitle>
        <CardDescription>
          Tool calls and message flow saved for this review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {toolCalls.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium">Tool calls</h3>
            <ScrollArea className="h-64 rounded-lg border">
              <div className="divide-y">
                {toolCalls.map((call) => (
                  <div key={call.id} className="space-y-2 p-4 text-sm">
                    <p className="font-mono font-medium">{call.tool_name}</p>
                    {call.input && (
                      <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(call.input, null, 2)}
                      </pre>
                    )}
                    {call.output && (
                      <pre className="overflow-x-auto rounded bg-muted/60 p-2 text-xs whitespace-pre-wrap">
                        {typeof call.output === "string"
                          ? call.output
                          : JSON.stringify(call.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {events.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium">Events</h3>
            <ScrollArea className="h-64 rounded-lg border">
              <div className="divide-y">
                {events.map((event) => (
                  <div key={event.id} className="p-4 text-sm">
                    <p className="mb-1 font-medium capitalize">{event.role}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {event.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
