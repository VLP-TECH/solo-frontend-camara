import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { generateChatbotResponse } from "@/lib/chatbot-service";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; sender: "user" | "bot" }>>([
    { text: "¡Hola! Soy tu asistente de IA. Puedo ayudarte con información sobre el ecosistema digital valenciano, datos, indicadores y más. ¿En qué puedo asistirte?", sender: "bot" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Agregar mensaje del usuario
    const userMessage = { text: inputValue, sender: "user" as const };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Consultar base de datos para generar respuesta
      const aiResponse = await generateChatbotResponse(currentInput);
      setMessages(prev => [...prev, { text: aiResponse, sender: "bot" }]);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { 
        text: "Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.", 
        sender: "bot" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-80 h-96 flex flex-col shadow-2xl border-2">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold">Asistente IA</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">Pensando...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-background rounded-b-lg">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default ChatWidget;

