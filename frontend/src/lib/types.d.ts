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
  Create_at: string;
}

interface BackendError {
  message: string;
}
