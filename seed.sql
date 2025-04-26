DROP TABLE IF EXISTS post_tags;

DROP TABLE IF EXISTS comments;

DROP TABLE IF EXISTS posts;

DROP TABLE IF EXISTS tags;

DROP TABLE IF EXISTS profiles;

DROP TABLE IF EXISTS users;

CREATE TABLE
    users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE TABLE
    profiles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
        bio TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE TABLE
    posts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE INDEX idx_posts_user_id ON posts (user_id);

CREATE TABLE
    comments (
        id SERIAL PRIMARY KEY,
        post_id INT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE INDEX idx_comments_post_id ON comments (post_id);

CREATE INDEX idx_comments_user_id ON comments (user_id);

CREATE TABLE
    tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
    );

CREATE TABLE
    post_tags (
        post_id INT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        tag_id INT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
    );

CREATE INDEX idx_post_tags_tag_id ON post_tags (tag_id);

INSERT INTO
    users (username, email)
VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com'),
    ('carol', 'carol@example.com'),
    ('dave', 'dave@example.com'),
    ('eve', 'eve@example.com');

INSERT INTO
    profiles (user_id, bio, avatar_url)
VALUES
    (
        1,
        'Hi, I’m Alice — coffee addict & cat lover.',
        'https://example.com/avatars/alice.png'
    ),
    (
        2,
        'Bob here: marathon runner and amateur chef.',
        'https://example.com/avatars/bob.png'
    ),
    (
        3,
        'Carol: tech blogger & open-source contributor.',
        'https://example.com/avatars/carol.png'
    ),
    (
        4,
        'Dave: photographer & travel enthusiast.',
        'https://example.com/avatars/dave.png'
    ),
    (
        5,
        'Eve: UX designer who loves painting in my free time.',
        'https://example.com/avatars/eve.png'
    );

INSERT INTO
    posts (user_id, title, body, published)
VALUES
    (
        1,
        'Welcome to the blog',
        'This is the very first post.',
        TRUE
    ),
    (
        2,
        'Another day',
        'Reflections on the day.',
        FALSE
    ),
    (
        3,
        'Tech trends',
        'Thoughts on emerging tech.',
        TRUE
    ),
    (
        1,
        'Alice’s second post',
        'Follow-up from Alice.',
        TRUE
    ),
    (
        4,
        'Dave’s update',
        'What Dave has been working on.',
        FALSE
    );

INSERT INTO
    comments (post_id, user_id, comment_text)
VALUES
    (1, 2, 'Great first post!'),
    (1, 3, 'Thanks for sharing.'),
    (2, 1, 'Interesting perspective.'),
    (3, 5, 'I enjoyed reading this.'),
    (4, 2, 'Nice post, Alice!'),
    (5, 1, 'Good to see your insights.');

INSERT INTO
    tags (name)
VALUES
    ('tech'),
    ('life'),
    ('intro'),
    ('reflection'),
    ('tutorial'),
    ('news');

INSERT INTO
    post_tags (post_id, tag_id)
VALUES
    (1, 1),
    (1, 3),
    (2, 2),
    (2, 4),
    (3, 1),
    (3, 6),
    (4, 3),
    (5, 6);

-- tech
-- intro
-- life
-- reflection
-- tech
-- news
-- intro
-- news