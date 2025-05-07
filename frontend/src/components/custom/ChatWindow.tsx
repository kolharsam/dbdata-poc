import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { CreditCard, Database, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
}

interface AgentResponse {
  response: string;
  sqlQuery: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTool, setSelectedTool] = useState<"database" | "stripe">(
    "database"
  );

  const {
    mutate: sendMessageToAgent,
    data: agentResponse,
    isPending: isLoading,
    error,
    reset: resetAgentResponse,
  } = useMutation({
    mutationFn: async (userQuery: string) => {
      const response = await fetch("http://localhost:3000/query", {
        method: "POST",
        body: JSON.stringify({
          query: userQuery.trim(),
          tool: selectedTool,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.json() as Promise<AgentResponse>;
    },
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: "An error occurred while executing the query.",
          sender: "agent",
        },
      ]);
    }
  }, [error]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (agentResponse) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: agentResponse.response,
          sender: "agent",
        },
      ]);
      resetAgentResponse();
    }
  }, [agentResponse, resetAgentResponse]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    sendMessageToAgent(input.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-[60%] space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "w-full rounded-lg p-4",
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <div className="prose prose-sm dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ ...props }) => (
                      <div className="overflow-x-auto">
                        <table
                          className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ ...props }) => (
                      <thead
                        className="bg-gray-100 dark:bg-gray-800"
                        {...props}
                      />
                    ),
                    th: ({ ...props }) => (
                      <th
                        className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold whitespace-nowrap"
                        {...props}
                      />
                    ),
                    td: ({ ...props }) => (
                      <td
                        className="border border-gray-300 dark:border-gray-600 px-4 py-2 whitespace-nowrap"
                        {...props}
                      />
                    ),
                  }}
                >
                  {typeof message.content === "string"
                    ? sanitizeContent(message.content)
                    : `\`\`\`json\n${JSON.stringify(
                        message.content,
                        null,
                        2
                      )}\`\`\``}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted w-full rounded-lg p-4">
              <div className="flex space-x-2">
                <div
                  className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-[50%] relative">
          <div className="flex space-x-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2",
                selectedTool === "database"
                  ? "bg-[#336791] text-white border-[#336791] hover:bg-[#2a547a] hover:text-white"
                  : "text-[#336791] border-[#336791] hover:bg-[#336791] hover:text-white"
              )}
              onClick={() => setSelectedTool("database")}
            >
              <Database className="h-4 w-4" />
              <span>Database</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2",
                selectedTool === "stripe"
                  ? "bg-[#635BFF] text-white border-[#635BFF] hover:bg-[#4b44cc] hover:text-white"
                  : "text-[#635BFF] border-[#635BFF] hover:bg-[#635BFF] hover:text-white"
              )}
              onClick={() => setSelectedTool("stripe")}
            >
              <CreditCard className="h-4 w-4" />
              <span>Stripe</span>
            </Button>
          </div>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedTool === "database"
                ? "What do you want to know from your database?"
                : "What do you want to know from your Stripe account?"
            }
            className="pr-12 resize overflow-y-auto"
            rows={5}
          />
          <Button
            size="icon"
            className={cn(
              "absolute right-2 bottom-2",
              selectedTool === "database"
                ? "bg-[#336791] hover:bg-[#2a547a]"
                : "bg-[#635BFF] hover:bg-[#4b44cc]"
            )}
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center mt-2 mx-auto max-w-[60%]">
          Press <kbd className="px-1 py-0.5 bg-muted rounded border">Enter</kbd>{" "}
          to send,
          <kbd className="px-1 py-0.5 bg-muted rounded border ml-1">
            Shift
          </kbd>{" "}
          +<kbd className="px-1 py-0.5 bg-muted rounded border ml-1">Enter</kbd>{" "}
          for new line
        </div>
      </div>
    </div>
  );
}

function sanitizeContent(content: string) {
  let cleaned = content.replace(/\\n/g, "\n");
  const tripleBacktickRegex = /^```(?:markdown)?\n([\s\S]*)\n```$/;
  const match = cleaned.match(tripleBacktickRegex);

  if (match) {
    cleaned = match[1];
  }

  return cleaned;
}
