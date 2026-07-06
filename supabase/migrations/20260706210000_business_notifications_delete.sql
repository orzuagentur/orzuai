CREATE POLICY "Users can delete own business notifications"
ON public.business_notifications
FOR DELETE
TO authenticated
USING (public.user_owns_business(business_id));
