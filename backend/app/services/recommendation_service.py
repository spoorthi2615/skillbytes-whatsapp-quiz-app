from app.repositories.concept_mastery_repo import concept_mastery_repo

class RecommendationService:
    @staticmethod
    async def get_recommendations(user_id: str):
        # Query concept mastery records for this user
        mastery_list = await concept_mastery_repo.get_by_user(user_id)
        
        # Filter concepts that have low mastery (< 0.6)
        weak_concepts = [m for m in mastery_list if m.get("mastery_score", 1.0) < 0.6]
        
        recs = []
        if weak_concepts:
            for idx, c in enumerate(weak_concepts[:3]):
                score_pct = int(c.get("mastery_score", 0.5) * 100)
                recs.append({
                    "id": f"mastery_rec_{idx}",
                    "title": f"Reinforce: {c['concept']}",
                    "description": f"Your current mastery is low ({score_pct}%). We recommend generating a target assessment to practice this topic.",
                    "type": "revision",
                    "action_url": "/assessments"
                })
        
        # Add fallback/general recommendations if empty
        if not recs:
            recs.append({
                "id": "rec_default_1",
                "title": "Build AI Assessment",
                "description": "Ready to test yourself? Upload study materials and create custom mock quizzes.",
                "type": "assessment",
                "action_url": "/assessments"
            })
            recs.append({
                "id": "rec_default_2",
                "title": "Study Aids Dashboard",
                "description": "Explore flashcards and summaries generated from your uploads.",
                "type": "resume",
                "action_url": "/generated-content"
            })
            
        return recs
