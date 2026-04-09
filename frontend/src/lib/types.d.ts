interface Community {
  id: string;
  name: string;
  description: string;
  ownerID: string;
  owner_username: string;
  createdAt: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author_id: string;
  author_username: string;
  community_id: number;
  createdAt: string;
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
