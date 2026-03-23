-- Migration for Propositions (Cahier de Doléances)

-- Table for propositions
CREATE TABLE IF NOT EXISTS propositions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commune_id UUID NOT NULL REFERENCES commune(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Logical user ID from local storage
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  user_firstname TEXT NOT NULL,
  user_lastname TEXT NOT NULL,
  user_email TEXT NOT NULL,
  votes_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for votes
CREATE TABLE IF NOT EXISTS proposition_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposition_id UUID REFERENCES propositions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proposition_id, user_id)
);

-- Table for comments
CREATE TABLE IF NOT EXISTS proposition_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposition_id UUID REFERENCES propositions(id) ON DELETE CASCADE,
  user_firstname TEXT NOT NULL,
  user_lastname TEXT NOT NULL,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_propositions_commune_id ON propositions(commune_id);
CREATE INDEX IF NOT EXISTS idx_propositions_updated_at ON propositions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_propositions_votes_count ON propositions(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_proposition_votes_proposition_id ON proposition_votes(proposition_id);
CREATE INDEX IF NOT EXISTS idx_proposition_comments_proposition_id ON proposition_comments(proposition_id);

-- Updated at Trigger
DROP TRIGGER IF EXISTS update_propositions_updated_at ON propositions;
CREATE TRIGGER update_propositions_updated_at BEFORE UPDATE ON propositions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Allowing public operations as per other tables in the project for simplicity,
-- but ensuring they are scoped by commune_id in the app)
ALTER TABLE propositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposition_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposition_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Propositions are public within their commune" ON propositions;
CREATE POLICY "Propositions are public within their commune"
    ON propositions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can create a proposition" ON propositions;
CREATE POLICY "Anyone can create a proposition"
    ON propositions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Creators can update/delete their own propositions" ON propositions;
CREATE POLICY "Creators can update/delete their own propositions"
    ON propositions FOR ALL
    USING (true); -- Verification will be done at app level for now as per project style

DROP POLICY IF EXISTS "Anyone can vote" ON proposition_votes;
CREATE POLICY "Anyone can vote"
    ON proposition_votes FOR ALL
    USING (true);

DROP POLICY IF EXISTS "Anyone can comment" ON proposition_comments;
CREATE POLICY "Anyone can comment"
    ON proposition_comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can create a comment" ON proposition_comments;
CREATE POLICY "Anyone can create a comment"
    ON proposition_comments FOR INSERT
    WITH CHECK (true);

-- Atomic increment for votes
CREATE OR REPLACE FUNCTION increment_votes(proposition_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE propositions
    SET votes_count = votes_count + 1,
        updated_at = NOW()
    WHERE id = proposition_id;
END;
$$ LANGUAGE plpgsql;
