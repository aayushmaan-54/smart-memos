# Smart Memos

- user create/edit notes
- on closing of document or if no data is being entered for past 4 minutes we crete background job that first removes the embedings fo documetn if new summary of whole document + what it store in summary + metadata embedings are ready for it in db
- add limitation for docuemnt length to prevent abuse
- we are stroign what documet stores as if ai cant find anyhting user is searching for for like in metada embediings and document summary they may can find in emebedings for what doucmet is storing and user can go through that notes to dfind info
- for guest user store embeddings in indexdb
- during login give option for privacy mode so that for notes no embeddings will be store for ntoes
- store username nad email in redis for uqick username and eamil check
- if user create account and didnt verify and try to login we should redirect them to otp verification and no need to send new otp just show resend opt button with some time restrictin
- also apply validation for resend eail in backend store otp_sned_at in backend and chekc currnet time from backend not frotend if user is resnding otp to prevent abuse
- username, email, password, oauth: google, microsoft, apple.
