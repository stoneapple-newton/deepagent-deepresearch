from datetime import datetime

from api.models import ResearchSession


class TestHealth:
    def test_health_returns_ok(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestAgents:
    def test_get_agents_returns_list(self, client):
        response = client.get("/api/agents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_seed_agents_creates_defaults(self, client):
        response = client.post("/api/agents/seed")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_seed_agents_is_idempotent(self, client):
        r1 = client.post("/api/agents/seed")
        assert r1.status_code == 200
        count1 = len(r1.json())

        r2 = client.post("/api/agents/seed")
        assert r2.status_code == 200
        count2 = len(r2.json())

        assert count1 == count2

    def test_get_agent_by_id(self, client):
        client.post("/api/agents/seed")
        agents = client.get("/api/agents").json()
        agent_id = agents[0]["id"]

        response = client.get(f"/api/agents/{agent_id}")
        assert response.status_code == 200
        assert response.json()["id"] == agent_id

    def test_get_agent_404(self, client):
        response = client.get("/api/agents/nonexistent")
        assert response.status_code == 404

    def test_update_agent(self, client):
        client.post("/api/agents/seed")
        agents = client.get("/api/agents").json()
        agent_id = agents[0]["id"]

        response = client.put(
            f"/api/agents/{agent_id}",
            json={"enabled": False, "temperature": 0.5},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
        assert data["temperature"] == 0.5


class TestSessions:
    def test_get_research_profiles(self, client):
        response = client.get("/api/research-profiles")
        assert response.status_code == 200
        data = response.json()
        assert data["default_profile"] == "standard"
        assert [profile["id"] for profile in data["profiles"]] == [
            "quick",
            "standard",
            "deep",
        ]

    def test_create_session(self, client):
        response = client.post(
            "/api/sessions",
            json={
                "query": "Test query",
                "thread_id": "test-thread",
                "model": "deepseek-chat",
                "max_llm_calls": 10,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "Test query"
        assert data["thread_id"] == "test-thread"
        assert data["status"] == "running"
        assert "id" in data

    def test_create_session_snapshots_selected_profile(self, client):
        response = client.post(
            "/api/sessions",
            json={
                "query": "Quick profile query",
                "thread_id": "quick-thread",
                "research_profile": "quick",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["research_profile"] == "quick"
        assert data["max_llm_calls"] == 12
        assert data["max_search_calls"] == 4
        assert data["max_subagent_calls"] == 2
        assert data["max_research_rounds"] == 1
        assert data["recursion_limit"] == 40

    def test_create_session_rejects_unknown_profile(self, client):
        response = client.post(
            "/api/sessions",
            json={"query": "Test", "research_profile": "missing"},
        )
        assert response.status_code == 422

    def test_get_sessions_reverse_chronological(self, client):
        # Create two sessions
        s1 = client.post(
            "/api/sessions",
            json={"query": "First", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()
        s2 = client.post(
            "/api/sessions",
            json={"query": "Second", "thread_id": "t2", "model": "deepseek-chat"},
        ).json()

        response = client.get("/api/sessions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        # First in list should be most recent
        ids = [x["id"] for x in data]
        assert ids.index(s2["id"]) < ids.index(s1["id"])

    def test_get_session_by_id(self, client):
        created = client.post(
            "/api/sessions",
            json={"query": "Test", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()

        response = client.get(f"/api/sessions/{created['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created["id"]
        assert "logs" in data

    def test_delete_session(self, client):
        created = client.post(
            "/api/sessions",
            json={"query": "To delete", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()

        response = client.delete(f"/api/sessions/{created['id']}")
        assert response.status_code == 200

        # Verify it's gone
        get_response = client.get(f"/api/sessions/{created['id']}")
        assert get_response.status_code == 404

    def test_continue_session_only_for_failed(self, client):
        # Create a running session
        created = client.post(
            "/api/sessions",
            json={"query": "Test", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()

        # Continue should fail for running session
        response = client.post(f"/api/sessions/{created['id']}/continue")
        assert response.status_code == 409

    def test_continue_session_for_failed(self, client, db_session):
        from sqlmodel import select
        # Create and manually set to failed
        created = client.post(
            "/api/sessions",
            json={"query": "Test", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()

        session = db_session.exec(
            select(ResearchSession).where(ResearchSession.id == created["id"])
        ).first()
        session.status = "failed"
        db_session.commit()

        response = client.post(f"/api/sessions/{created['id']}/continue")
        assert response.status_code == 200

    def test_continue_session_for_budget_exhausted(self, client, db_session):
        from sqlmodel import select
        created = client.post(
            "/api/sessions",
            json={"query": "Test", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()

        session = db_session.exec(
            select(ResearchSession).where(ResearchSession.id == created["id"])
        ).first()
        session.status = "budget_exhausted"
        db_session.commit()

        response = client.post(f"/api/sessions/{created['id']}/continue")
        assert response.status_code == 200


class TestReports:
    def test_reports_only_returns_completed(self, client, db_session):
        from sqlmodel import select
        # Create running session
        running = client.post(
            "/api/sessions",
            json={"query": "Running", "thread_id": "t1", "model": "deepseek-chat"},
        ).json()

        # Create completed session
        completed = client.post(
            "/api/sessions",
            json={"query": "Completed", "thread_id": "t2", "model": "deepseek-chat"},
        ).json()

        session = db_session.exec(
            select(ResearchSession).where(ResearchSession.id == completed["id"])
        ).first()
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db_session.commit()

        response = client.get("/api/reports")
        assert response.status_code == 200
        data = response.json()
        ids = [x["id"] for x in data]
        assert completed["id"] in ids
        assert running["id"] not in ids

    def test_reports_empty(self, client):
        response = client.get("/api/reports")
        assert response.status_code == 200
        assert response.json() == []
