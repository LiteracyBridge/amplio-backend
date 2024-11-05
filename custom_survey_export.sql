
begin transaction;

    {% for row in csv_reader %}
with t{{ loop.index }} as (
 SELECT distinct r.survey_uuid, question, '{{ row["desired"] }}' AS response, r.response AS old from survey_responses r WHERE EXISTS (SELECT * FROM surveys WHERE r.survey_uuid = surveys.survey_uuid and surveys.programid = 'SURVEY-DEMO' AND surveys.surveyid = 'survey1')
  AND r.question = '{{ row["question"] }}' AND r.response = '{{ row["given"] }}'
)
UPDATE  survey_responses r SET response = t{{ loop.index }}.response
FROM t{{ loop.index }}
WHERE r.survey_uuid = t{{ loop.index }}.survey_uuid AND r.response = t{{ loop.index }}.old
 AND r.response = '{{ row["given"] }}' AND r.question = '{{ row["question"] }}';

    {% endfor %}

commit;
