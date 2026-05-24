package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/Katyi/mini-reddit/backend/internal/chat"
	"github.com/Katyi/mini-reddit/backend/internal/comment"
	"github.com/segmentio/kafka-go"
)

// NotificationConsumer управляет чтением уведомлений из Kafka
type NotificationConsumer struct {
	reader *kafka.Reader
	hub    *chat.Hub
}

// NewNotificationConsumer создает новый экземпляр консьюмера
func NewNotificationConsumer(kafkaAddr string, hub *chat.Hub) *NotificationConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers: []string{kafkaAddr},
		Topic:   "comment-notifications", // Топик, куда сыпятся уведомления о комментах
		GroupID: "notification-service-group",
	})

	return &NotificationConsumer{
		reader: reader,
		hub:    hub,
	}
}

// Start запускает бесконечный цикл прослушивания Kafka в фоне
func (nc *NotificationConsumer) Start(ctx context.Context) {
	fmt.Println("🔔 [NOTIFICATION SERVICE] Консьюмер успешно запущен...")
	defer nc.reader.Close()

	for {
		select {
		case <-ctx.Done():
			fmt.Println("🛑 [NOTIFICATION SERVICE] Остановка консьюмера...")
			return
		default:
			msg, err := nc.reader.ReadMessage(ctx)
			if err != nil {
				log.Printf("❌ [NOTIFICATION SERVICE] Ошибка чтения: %v", err)
				continue
			}

			// Десериализуем структуру из пакета comment
			var event comment.CommentNotificationEvent
			if err := json.Unmarshal(msg.Value, &event); err != nil {
				log.Printf("❌ [NOTIFICATION SERVICE] Ошибка парсинга JSON: %v", err)
				continue
			}

			// Формируем красивый Payload, который поймет наш Фронтенд
			frontendPayload, err := json.Marshal(map[string]interface{}{
				"type": "notification",
				"data": map[string]string{
					"title": fmt.Sprintf("%s wrote a comment to your post in r/%s", event.CommentAuthor, event.CommunityName),
					"body":  fmt.Sprintf("%s", event.CommentContent),
					"link":  fmt.Sprintf("/r/%s/%s", event.CommunityName, event.PostID),
				},
			})
			if err != nil {
				log.Printf("❌ [NOTIFICATION SERVICE] Ошибка маршалинга JSON для фронта: %v", err)
				continue
			}

			// Отправляем уведомление автору поста через WebSocket Хаб из пакета chat
			nc.hub.BroadcastToUser(event.PostAuthorID, frontendPayload)
			fmt.Printf("📬 [NOTIFICATION SERVICE] Уведомление доставлено пользователю %s\n", event.PostAuthorID)
		}
	}
}
