"""Scorers that judge whether an attack succeeded.

Day 1: deterministic scoring lives inside each AttackBase.run.
Day 2+: this package adds the LLM-as-judge for fuzzy attacks like jailbreaks
and harmful content production.
"""

from agentsentry.scoring.llm_judge import LLMJudge, JudgeVerdict

__all__ = ["LLMJudge", "JudgeVerdict"]
