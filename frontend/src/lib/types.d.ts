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
  content?: string;
  author_id: string;
  author_username: string;
  community_id: string;
  community_name: string;
  image_url?: string;
  created_at: string;
  rating: number;
  user_vote: number;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  parent_id: string;
  content: string;
  created_at: string;
  rating: number;
  user_vote: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  karma: number;
  created_at: string;
  unread_count: number;
}

interface BackendError {
  message: string;
}

interface Message {
  id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
