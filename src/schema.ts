import { gql } from "graphql-tag";

export const typeDefs = gql`
  # User type
  type User {
    id: Int!
    name: String!
    email: String!
    createdAt: String!
    updatedAt: String!
    posts: [Post!]!
    comments: [Comment!]!
  }

  # Post type
  type Post {
    id: Int!
    title: String!
    content: String!
    author: User!
    authorId: Int!
    views: Int!
    likes: Int!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }

  # Comment type
  type Comment {
    id: Int!
    content: String!
    author: User!
    authorId: Int!
    post: Post!
    postId: Int!
    createdAt: String!
    updatedAt: String!
  }

  # Query type
  type Query {
    # User queries
    user(id: Int!): User
    users: [User!]!

    # Post queries
    post(id: Int!): Post
    posts: [Post!]!
    postsByAuthor(authorId: Int!): [Post!]!

    # Comment queries
    commentsByPost(postId: Int!): [Comment!]!
    comments: [Comment!]!

    # Health check
    health: String!
  }

  # Mutation type
  type Mutation {
    # User mutations
    createUser(name: String!, email: String!, password: String!): User!
    updateUser(id: Int!, name: String, email: String): User
    deleteUser(id: Int!): Boolean!

    # Post mutations
    createPost(title: String!, content: String!, authorId: Int!): Post!
    updatePost(id: Int!, title: String, content: String): Post
    deletePost(id: Int!): Boolean!
    incrementPostViews(id: Int!): Post
    likePost(id: Int!): Post

    # Comment mutations
    createComment(content: String!, authorId: Int!, postId: Int!): Comment!
    updateComment(id: Int!, content: String!): Comment
    deleteComment(id: Int!): Boolean!
  }

  # Subscription type
  type Subscription {
    postCreated: Post!
    commentAdded(postId: Int!): Comment!
  }
`;
