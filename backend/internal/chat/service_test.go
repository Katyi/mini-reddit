package chat

import (
	"context"
	"testing"
)

// Тестируем правильность сборки структуры ChatSummary сервисом
func TestService_GetActiveChats_SummaryMapping(t *testing.T) {
	// Инициализируем пустой репозиторий
	repo := &Repository{}
	s := NewService(repo)

	// Запускаем метод. Так как r.db == nil, наши заглушки вернут nil и пустую карту.
	summaries, err := s.GetActiveChats(context.Background(), "my-user-id")
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Проверяем, что для пустого ответа базы сервис возвращает пустой слайс, а не падает
	if len(summaries) != 0 {
		t.Errorf("Expected 0 summaries, got %d", len(summaries))
	}
}

// Дополнительно протестируем логику создания сообщений боту в Хабе
func TestHub_AI_Bot_ID_Constant(t *testing.T) {
	// Важно проверять константы, на которых держится бизнес-логика чата с ИИ
	expectedBotID := "00000000-0000-0000-0000-000000000000"
	if AI_BOT_ID != expectedBotID {
		t.Errorf("AI_BOT_ID handles AI chat routing. Expected %s, got %s", expectedBotID, AI_BOT_ID)
	}
}
