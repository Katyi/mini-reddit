package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type Service struct {
	apiKey string
	apiUrl string
}

func NewService() *Service {
	return &Service{
		apiKey: os.Getenv("OPENROUTER_API_KEY"),
		apiUrl: "https://openrouter.ai/api/v1/chat/completions",
	}
}

func (s *Service) AskAI(userPrompt string) (string, error) {
	requestBody, _ := json.Marshal(map[string]interface{}{
		// "model": "tencent/hy3-preview:free",
		"model": "openai/gpt-oss-120b:free",
		"messages": []map[string]string{
			{"role": "system", "content": "You're a helpful assistant in the Mini-Reddit app. Keep your replies short and to the point."},
			{"role": "user", "content": userPrompt},
		},
	})

	req, _ := http.NewRequest("POST", s.apiUrl, bytes.NewBuffer(requestBody))
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	// OpenRouter просит эти заголовки для корректной работы
	req.Header.Set("HTTP-Referer", "http://localhost:8080")
	req.Header.Set("X-Title", "Mini-Reddit")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Если ошибка, давай выведем её текст для отладки
		var errBody bytes.Buffer
		errBody.ReadFrom(resp.Body)
		fmt.Printf("API Error Body: %s\n", errBody.String())
		return fmt.Sprintf("API Error: %d", resp.StatusCode), nil
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("JSON Decode Error: %v\n", err) // Добавь это для отладки
		return "", err
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}

	return "Sorry, I couldn't think of an answer.", nil
}
