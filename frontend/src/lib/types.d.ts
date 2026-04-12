interface Community {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  owner_username: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_username: string;
  community_id: string;
  created_at: string;
  rating: number;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  parent_id: string;
  content: string;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  Create_at: string;
}

// type User struct {
// 	ID           string    `json:"id"`
// 	Username     string    `json:"username"`
// 	Email        string    `json:"email"`
// 	Password     string    `json:"password,omitempty"` // omitempty, чтобы не светить в ответах
// 	PasswordHash string    `json:"-"`                  // вообще не выводим в JSON
// 	CreatedAt    time.Time `json:"created_at"`
// }

interface BackendError {
  message: string;
}
